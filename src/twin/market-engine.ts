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

import { getMirror, type MirrorFrame } from "./not-mirror";
import { fuseFrame, fusionBlocker, type Fusion } from "./fusion";
import { PaperHarness, type HarnessCycle } from "./paper-harness";
import type { PaperTrade } from "./paper-broker";
import type { RiskContext } from "@/soall/types";

export interface MarketSnapshot {
  symbol: string;
  label: string;
  base: string;
  connected: boolean;
  cycle: HarnessCycle | null;
  fusion: Fusion;
  frame: MirrorFrame;
  /** Mark-to-market PnL of the open position, in USDT. 0 when flat. */
  unrealizedPnL: number;
  blockedBy: string | null;
  trades: readonly PaperTrade[];
  ticks: number;
}

export class MarketEngine {
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
  }

  private onFrame(f: MirrorFrame) {
    if (!this.active) return;
    if (!f.lastPrice || f.lastTradeAt === this.lastIngestedAt) return;
    this.lastIngestedAt = f.lastTradeAt;

    const fusion = fuseFrame(f);
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
    const block = [...cycle.entries]
      .reverse()
      .find((e) => e.kind === "EXEC_BLOCK");
    this.blockedBy = block ? String(block.payload.blockedBy) : null;
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
      frame,
      unrealizedPnL,
      blockedBy: this.blockedBy,
      trades: this.harness.broker.recent(20),
      ticks: this.ticks,
    };
  }
}
