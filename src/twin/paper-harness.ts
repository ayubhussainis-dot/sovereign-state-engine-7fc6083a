/**
 * Paper Trading Harness — glues the live Binance Futures Testnet feed
 * to the deterministic MDT spine.
 *
 * A caller pushes ticks in via `ingest()`. The harness:
 *   1. Assigns a monotonic twin sequence via `InternalMarket.append`.
 *   2. Emits a `TwinSnapshot` and folds the tick into Welford variance.
 *   3. Profiles the PPG telemetry layer (pure).
 *   4. Runs the SOALL G1..G8 pipeline (pure).
 *   5. Journals TWIN_TICK, PPG_SNAPSHOT, GATE_REPORT and — when the
 *      pipeline passes — a synthetic ORDER_INTENT into the hash-chained
 *      audit ledger. Nothing is ever sent to a broker.
 *
 * Contract: single mutable instance, but every step above is a pure
 * function of the ingested tick sequence, so replaying the same tape
 * against a fresh harness yields an identical audit chain.
 */

import { InternalMarket } from "./internal-market";
import { profile, Welford } from "@/ppg/profiler";
import { runPipeline } from "@/soall/pipeline";
import { AuditLedger, type AuditEntry } from "@/lib/audit-ledger";
import type { RiskContext, GateReport } from "@/soall/types";
import type { LiveTick, TwinSnapshot } from "./types";
import type { PPGSnapshot } from "@/ppg/types";
import { PaperBroker, type PaperStats, type Side } from "./paper-broker";

export interface HarnessCycle {
  twin: TwinSnapshot;
  ppg: PPGSnapshot;
  report: GateReport;
  entries: AuditEntry[];
  broker: PaperStats;
}

export interface HarnessTickInput {
  price: number;
  volume?: number;
  ts: number;
  receivedAt: number;
  bid?: number;
  ask?: number;
  side?: LiveTick["side"];
  /** Directional intent from the fusion layer; drives paper entries. */
  intent?: Side | "flat";
  /** Diagnostic from the fusion layer: which term blocked a LOCKED verdict. */
  fusion?: {
    verdict: string;
    agreement: number;
    consensusBull: number;
    consensusBear: number;
    notAxis: number;
    tonAxis: number;
    notConfidence: number;
    tonConfidence: number;
    blocker: string | null;
  };
}

export class PaperHarness {
  readonly symbol: string;
  private readonly market = new InternalMarket({ capacity: 4096 });
  private readonly welford = new Welford();
  readonly ledger = new AuditLedger(4096);
  readonly broker = new PaperBroker();
  private risk: RiskContext = {
    drawdownFraction: 0,
    consecutiveLosses: 0,
    systemHealth: "NORMAL",
  };

  constructor(symbol = "BTCUSDT") {
    this.symbol = symbol;
  }

  setRisk(risk: Partial<RiskContext>): void {
    this.risk = { ...this.risk, ...risk };
  }

  ingest(input: HarnessTickInput): HarnessCycle {
    const live: LiveTick = {
      ts: input.ts,
      receivedAt: input.receivedAt,
      price: input.price,
      volume: input.volume ?? 0,
      side: input.side,
      bid: input.bid,
      ask: input.ask,
    };
    const tick = this.market.append(live);
    const twin = this.market.snapshot();
    const ppg = profile({ twin }, this.welford);
    const report = runPipeline({ twin, ppg, risk: this.risk });

    const entries: AuditEntry[] = [];
    entries.push(
      this.ledger.append("TWIN_TICK", tick.ts, {
        twinSeq: tick.twinSeq,
        price: tick.price,
        side: tick.side,
        latencyMs: tick.latencyMs,
      }),
    );
    entries.push(
      this.ledger.append("PPG_SNAPSHOT", tick.ts, {
        twinSeq: ppg.twinSeq,
        volatility: ppg.volatility.value,
        ofi: ppg.ofi.value,
        wave: ppg.wave.state,
        velocity: ppg.velocity.value,
      }),
    );
    entries.push(this.ledger.appendGateReport(tick.ts, report));

    // 1) Mark-to-market first: an already-open position gets a chance to
    //    close on THIS tick before a new one can be opened.
    const markEv = this.broker.mark(tick.price, tick.ts);
    if (markEv && markEv.kind === "CLOSE") {
      entries.push(
        this.ledger.append("TRADE_CLOSED", tick.ts, {
          id: markEv.trade.id,
          side: markEv.trade.side,
          entry: markEv.trade.entry,
          exit: markEv.trade.exit,
          qty: markEv.trade.qty,
          pnl: markEv.trade.pnl,
          reason: markEv.trade.reason,
        }),
      );
    }

    // 2) If gates passed AND fusion is directional, log intent + open.
    if (report.allPassed) {
      const dir: Side | null =
        input.intent === "long" || input.intent === "short" ? input.intent : null;
      entries.push(
        this.ledger.append("ORDER_INTENT", tick.ts, {
          twinSeq: tick.twinSeq,
          mode: "PAPER",
          price: tick.price,
          intent: dir ?? "flat",
        }),
      );
      if (dir) {
        const fill = this.broker.open({
          side: dir,
          price: tick.price,
          ts: tick.ts,
          twinSeq: tick.twinSeq,
        });
        if (fill && fill.kind === "FILL") {
          entries.push(
            this.ledger.append("ORDER_FILLED", tick.ts, {
              id: fill.position.id,
              side: fill.position.side,
              entry: fill.position.entry,
              stop: fill.position.stop,
              target: fill.position.target,
              qty: fill.position.qty,
            }),
          );
        }
      }
    } else if (report.failedAt === "G7_RISK" || report.failedAt === "G8_AUTHORITY") {
      entries.push(
        this.ledger.append("AUTHORITY_VETO", tick.ts, {
          twinSeq: tick.twinSeq,
          failedAt: report.failedAt,
        }),
      );
    }

    // 3) Nothing opened this cycle → journal exactly WHY.
    if (!this.broker.stats().openPosition) {
      const dir =
        input.intent === "long" || input.intent === "short" ? input.intent : null;
      const weakest = report.outcomes.reduce((a, b) => (b.score < a.score ? b : a));
      let blockedBy: string;
      let detail: Record<string, unknown>;
      if (report.failedAt) {
        blockedBy = `HARD_VETO:${report.failedAt}`;
        detail = {
          reason:
            report.outcomes.find((o) => o.gate === report.failedAt)?.reason ?? "",
        };
      } else if (!report.tradeArmed) {
        blockedBy = "COMPOSITE_BELOW_THRESHOLD";
        detail = {
          composite: report.compositeScore,
          threshold: report.compositeThreshold,
          weakestGate: weakest.gate,
          weakestScore: weakest.score,
          weakestReason: weakest.reason,
        };
      } else if (!dir) {
        blockedBy = `FUSION:${input.fusion?.blocker ?? "NO_DIRECTION"}`;
        detail = {
          verdict: input.fusion?.verdict ?? "UNKNOWN",
          agreement: input.fusion?.agreement,
          consensusBull: input.fusion?.consensusBull,
          consensusBear: input.fusion?.consensusBear,
          notAxis: input.fusion?.notAxis,
          tonAxis: input.fusion?.tonAxis,
          notConfidence: input.fusion?.notConfidence,
          tonConfidence: input.fusion?.tonConfidence,
        };
      } else {
        blockedBy = "BROKER_REJECTED";
        detail = { intent: dir };
      }
      entries.push(
        this.ledger.append("EXEC_BLOCK", tick.ts, {
          twinSeq: tick.twinSeq,
          blockedBy,
          ...detail,
        }),
      );
    }

    return { twin, ppg, report, entries, broker: this.broker.stats() };
  }

  reset(): void {
    this.market.reset();
    this.ledger.reset();
    this.broker.reset();
    this.welford.reset();
  }
}