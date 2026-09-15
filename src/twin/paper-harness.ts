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
 *      audit ledger.
 *   6. Calls the paper broker only after the deterministic decision
 *      pipeline has produced an approved directional intent.
 *
 * Contract: single mutable instance, but every market/PPG/SOALL step
 * remains a pure function of the ingested tick sequence.
 *
 * Execution architecture:
 *
 *   MARKET FEED
 *       ↓
 *   INTERNAL MARKET TWIN
 *       ↓
 *   PPG
 *       ↓
 *   SOALL G1..G8
 *       ↓
 *   FUSION / INTENT
 *       ↓
 *   PAPER BROKER
 *       ↓
 *   STOP / TARGET
 *
 * The broker does not participate in PPG or SOALL calculations.
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
    /*
     * ------------------------------------------------------------
     * 1. MARKET → INTERNAL MARKET TWIN
     * ------------------------------------------------------------
     */
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

    /*
     * ------------------------------------------------------------
     * 2. INTERNAL MARKET TWIN → PPG
     * ------------------------------------------------------------
     */
    const ppg = profile({ twin }, this.welford);

    /*
     * ------------------------------------------------------------
     * 3. PPG → SOALL G1..G8
     * ------------------------------------------------------------
     *
     * The deterministic decision spine is evaluated before the
     * broker is asked to do anything.
    
