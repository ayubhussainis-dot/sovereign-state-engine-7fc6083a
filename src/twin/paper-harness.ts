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
import { resetWelford, profile } from "@/ppg/profiler";
import { runPipeline } from "@/soall/pipeline";
import { AuditLedger, type AuditEntry } from "@/lib/audit-ledger";
import type { RiskContext, GateReport } from "@/soall/types";
import type { LiveTick, TwinSnapshot } from "./types";
import type { PPGSnapshot } from "@/ppg/types";

export interface HarnessCycle {
  twin: TwinSnapshot;
  ppg: PPGSnapshot;
  report: GateReport;
  entries: AuditEntry[];
}

export interface HarnessTickInput {
  price: number;
  volume?: number;
  ts: number;
  receivedAt: number;
  bid?: number;
  ask?: number;
  side?: LiveTick["side"];
}

export class PaperHarness {
  private readonly market = new InternalMarket({ capacity: 4096 });
  readonly ledger = new AuditLedger(4096);
  private risk: RiskContext = {
    drawdownFraction: 0,
    consecutiveLosses: 0,
    systemHealth: "NORMAL",
  };

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
    const ppg = profile({ twin });
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
    if (report.allPassed) {
      entries.push(
        this.ledger.append("ORDER_INTENT", tick.ts, {
          twinSeq: tick.twinSeq,
          mode: "PAPER",
          price: tick.price,
          note: "simulated — no broker execution",
        }),
      );
    } else if (report.failedAt === "G7_RISK" || report.failedAt === "G8_AUTHORITY") {
      entries.push(
        this.ledger.append("AUTHORITY_VETO", tick.ts, {
          twinSeq: tick.twinSeq,
          failedAt: report.failedAt,
        }),
      );
    }

    return { twin, ppg, report, entries };
  }

  reset(): void {
    this.market.reset();
    this.ledger.reset();
    resetWelford();
  }
}