/**
 * Market Engine — one fully independent deterministic pipeline per market.
 *
 * Reuses the existing spine verbatim:
 *   BinanceMirror (feed) → PaperHarness (InternalMarket → PPG → SOALL →
 *   PaperBroker) with fusion supplying directional intent.
 *
 * No business logic is duplicated here. This class only owns per-market
 * *state*: its own mirror socket, its own twin/ledger/broker/Welford
 * accumulator. A trade on one market can never touch another because no
 * mutable state is shared between instances.
 */
import { JOALLTranslator } from "../joall/translator";
import { MC01StateEngine } from "../mc01/state-engine";
import { getMirror, type MirrorFrame } from "./not-mirror";
import { fuseFrame, fusionBlocker, type Fusion } from "./fusion";
import { PaperHarness, type HarnessCycle } from "./paper-harness";
import type { PaperTrade } from "./paper-broker";
import type { RiskContext } from "@/soall/types";
import type { MC01State } from "../mc01/state-engine";
import { tradeLedger } from "@/lib/trade-ledger";

interface EntryContext {
  timestamp: number;
  joallValue: number;
  mc01State: string;
  eyeEnergy: number;
  reasonEntry: string;
}

function mc01Label(s: MC01State): string {
  const dir =
    s.bullish > s.bearish ? "BULL" : s.bearish > s.bullish ? "BEAR" : "NEUTRAL";
  return `${dir} dom=${s.dominance.toFixed(1)} conf=${s.confidence.toFixed(2)}`;
}

export interface MarketSnapshot {
  symbol: string;
  label: string;
  base: string;
  connected: boolean;
  cycle: HarnessCycle | null;
  fusion: Fusion;
  frame: MirrorFrame;
  mc01: MC01State;
  /** Mark-to-market PnL of the open position, in USDT. 0 when flat. */
  unrealizedPnL: number;
  blockedBy: string | null;
  trades: readonly PaperTrade[];
  ticks: number;
}

export class MarketEngine {
  private readonly mc01 = new MC01StateEngine();
  private readonly joall = new JOALLTranslator();
  readonly symbol: string;
  readonly label: string;
  readonly base: string;
  readonly harness: PaperHarness;
  private readonly mirror = { unsub: null as null | (() => void) };
  private active = false;
  private lastIngestedAt = 0;
  private cycle: HarnessCycle | null = null;
  private ticks = 0;
  private blockedBy: string | null = null;
  private readonly entryContext = new Map<number, EntryContext>();

  constructor(symbol: string, base: string) {
    this.symbol = symbol;
    this.base = base;
    this.label = `${base}/USDT`;
    this.harness = new PaperHarness(symbol);
  }

  setRisk(risk: Partial<RiskContext>) {
    this.harness.setRisk(risk);
  }

  start() {
    if (this.active) return;
    this.active = true;
    const m = getMirror(this.symbol);
    console.info(`[MarketEngine] ${this.symbol} subscribing to mirror`);
    this.mirror.unsub = m.subscribe((f) => this.onFrame(f));
  }

  stop() {
    this.active = false;
    this.mirror.unsub?.();
    this.mirror.unsub = null;
  }

  reset() {
    this.harness.reset();
    this.cycle = null;
    this.ticks = 0;
    this.lastIngestedAt = 0;
    this.blockedBy = null;
    this.entryContext.clear();
  }

  private onFrame(f: MirrorFrame) {
    if (!this.active) return;
    if (!f.lastPrice || f.lastTradeAt === this.lastIngestedAt) return;
    this.lastIngestedAt = f.lastTradeAt;

    const fusion = fuseFrame(f);
    this.mc01.update(this.joall.translate(f));
    const cycle = this.harness.ingest({
      price: f.lastPrice,
      volume: f.lastQty,
      ts: f.lastEventTs || f.lastTradeAt,
      receivedAt: Date.now(),
      bid: f.bid > 0 ? f.bid : undefined,
      ask: f.ask > 0 ? f.ask : undefined,
      side: f.lastSide ?? undefined,
      intent:
        fusion.verdict === "LOCKED-BULL"
          ? "long"
          : fusion.verdict === "LOCKED-BEAR"
            ? "short"
            : "flat",
      fusion: {
        verdict: fusion.verdict,
        agreement: fusion.agreement,
        consensusBull: fusion.consensusBull,
        consensusBear: fusion.consensusBear,
        notAxis: fusion.not.axis,
        tonAxis: fusion.ton.axis,
        notConfidence: fusion.not.confidence,
        tonConfidence: fusion.ton.confidence,
        blocker: fusionBlocker(fusion),
      },
    });
    this.cycle = cycle;
    this.ticks++;
    if (this.ticks === 1) {
      console.info(
        `[MarketEngine] ${this.symbol} FIRST LIVE TICK @ ${f.lastPrice}`,
      );
    }
    const block = [...cycle.entries]
      .reverse()
      .find((e) => e.kind === "EXEC_BLOCK");
    this.blockedBy = block ? String(block.payload.blockedBy) : null;
    this.journal(cycle, fusion);
  }

  /**
   * Mirror real broker fills/closes into the permanent trade ledger.
   * Driven only by audit entries the PaperBroker actually produced.
   */
  private journal(cycle: HarnessCycle, fusion: ReturnType<typeof fuseFrame>) {
    for (const e of cycle.entries) {
      if (e.kind === "ORDER_FILLED") {
        const id = Number(e.payload.id);
        const composite = Math.min(1, Math.max(0, cycle.report.compositeScore));
        const eyeEnergy =
          Math.tanh(
            Math.abs(cycle.ppg.ofi.value) + Math.abs(cycle.ppg.velocity.value),
          ) * 100;
        this.entryContext.set(id, {
          timestamp: e.ts,
          joallValue: 1 + Math.round(9 * composite),
          mc01State: mc01Label(this.mc01.getState()),
          eyeEnergy: Number(eyeEnergy.toFixed(2)),
          reasonEntry:
            `FUSION ${fusion.verdict} · composite ${composite.toFixed(3)}` +
            ` · wave ${cycle.ppg.wave.state} · agreement ${fusion.agreement.toFixed(2)}`,
        });
      } else if (e.kind === "TRADE_CLOSED") {
        const id = Number(e.payload.id);
        const ctx = this.entryContext.get(id);
        this.entryContext.delete(id);
        const side = String(e.payload.side);
        const reason = String(e.payload.reason);
        const exit = Number(e.payload.exit);
        tradeLedger.append({
          id: `${this.symbol}-${id}-${e.ts}`,
          timestamp: ctx?.timestamp ?? e.ts,
          closedAt: e.ts,
          symbol: this.symbol,
          direction: side === "long" ? "BUY" : "SELL",
          entryPrice: Number(e.payload.entry),
          exitPrice: exit,
          quantity: Number(e.payload.qty),
          pnl: Number(e.payload.pnl),
          joallValue: ctx?.joallValue ?? 0,
          mc01State: ctx?.mc01State ?? "UNKNOWN",
          eyeEnergy: ctx?.eyeEnergy ?? 0,
          reasonEntry: ctx?.reasonEntry ?? "UNRECORDED",
          reasonExit: `${reason} HIT @ ${exit.toFixed(2)}`,
        });
      }
    }
  }

  snapshot(): MarketSnapshot {
    const frame = getMirror(this.symbol).current;
    const fusion = fuseFrame(frame);
    const stats = this.harness.broker.stats();
    const mark = this.cycle?.twin.last?.price ?? frame.lastPrice;
    const pos = stats.openPosition;
    const unrealizedPnL =
      pos && mark > 0
        ? pos.side === "long"
          ? (mark - pos.entry) * pos.qty
          : (pos.entry - mark) * pos.qty
        : 0;
    return {
      symbol: this.symbol,
      label: this.label,
      base: this.base,
      connected: frame.connected,
      cycle: this.cycle,
      fusion,
      mc01: this.mc01.getState(),
      frame,
      unrealizedPnL,
      blockedBy: this.blockedBy,
      trades: this.harness.broker.recent(20),
      ticks: this.ticks,
    };
  }
}
