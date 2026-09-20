/**
 * Paper Trading Harness
 *
 * Connects the live Binance Futures feed to the deterministic MDT spine.
 *
 * Flow:
 *   Live Tick
 *     -> Internal Market
 *     -> Twin Snapshot
 *     -> PPG
 *     -> Existing Position Mark
 *     -> Risk State Update
 *     -> SOALL G1..G8
 *     -> Fusion Direction
 *     -> Paper Execution
 *
 * No live exchange orders are sent.
 *
 * Execution authority:
 *   - G1 = hard synchronization safety veto
 *   - G2..G6 = quality gates
 *   - G7 = hard risk veto
 *   - G8 = final authority
 *
 * G2..G6 do not independently block paper execution.
 */

import { InternalMarket } from "./internal-market";
import { profile, Welford } from "@/ppg/profiler";
import { runPipeline } from "@/soall/pipeline";
import { AuditLedger, type AuditEntry } from "@/lib/audit-ledger";
import type { RiskContext, GateReport } from "@/soall/types";
import type { LiveTick, TwinSnapshot } from "./types";
import type { PPGSnapshot } from "@/ppg/types";
import {
  PaperExecutionSimulator,
  type PaperStats,
  type Side,
} from "./paper-execution-simulator";
import { checkpoint, type T9Checkpoint } from "@/tix/t9";

export interface HarnessCycle {
  twin: TwinSnapshot;
  ppg: PPGSnapshot;
  report: GateReport;
  entries: AuditEntry[];
  paper: PaperStats;
  tixT9: readonly T9Checkpoint[];
}

export interface HarnessTickInput {
  price: number;
  volume?: number;
  ts: number;
  receivedAt: number;
  bid?: number;
  ask?: number;
  side?: LiveTick["side"];

  /**
   * Explicit directional intent from the Fusion layer.
   *
   * Only "long" or "short" can open a position.
   * "flat" means no directional trade.
   */
  intent?: Side | "flat";

  /**
   * Diagnostic from the Fusion layer.
   */
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

  private readonly market = new InternalMarket({
    capacity: 4096,
  });

  private readonly welford = new Welford();

  readonly ledger = new AuditLedger(4096);

  readonly paper = new PaperExecutionSimulator();

  private risk: RiskContext = {
    drawdownFraction: 0,
    consecutiveLosses: 0,
    systemHealth: "NORMAL",
  };

  constructor(symbol = "BTCUSDT") {
    this.symbol = symbol;
  }

  setRisk(risk: Partial<RiskContext>): void {
    this.risk = {
      ...this.risk,
      ...risk,
    };
  }

  private updateRiskFromClosedTrade(pnl: number): void {
    if (!Number.isFinite(pnl)) {
      return;
    }

    if (pnl < 0) {
      this.risk = {
        ...this.risk,
        consecutiveLosses:
          this.risk.consecutiveLosses + 1,
      };
      return;
    }

    if (pnl > 0) {
      this.risk = {
        ...this.risk,
        consecutiveLosses: 0,
      };
    }
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

    const tixT9: T9Checkpoint[] = [
      checkpoint("MARKET", tick.twinSeq, {
        status: "PARSED",
      }),

      checkpoint("DIGITAL_TWIN", tick.twinSeq, {
        status: "OBSERVED",
      }),
    ];

    const ppg = profile(
      { twin },
      this.welford,
    );

    tixT9.push(
      checkpoint("JACK_JOKER", tick.twinSeq, {
        status: "OBSERVED",
      }),
    );

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

    /*
     * 1. Mark the existing position first.
     *
     * The current market tick is allowed to close
     * an existing position before a new authority
     * decision is made.
     */
    const markEv = this.paper.mark(
      tick.price,
      tick.ts,
    );

    if (
      markEv &&
      markEv.kind === "CLOSE"
    ) {
      this.updateRiskFromClosedTrade(
        markEv.trade.pnl,
      );

      entries.push(
        this.ledger.append(
          "TRADE_CLOSED",
          tick.ts,
          {
            id: markEv.trade.id,
            side: markEv.trade.side,
            entry: markEv.trade.entry,
            exit: markEv.trade.exit,
            qty: markEv.trade.qty,
            pnl: markEv.trade.pnl,
            reason: markEv.trade.reason,
            consecutiveLosses:
              this.risk.consecutiveLosses,
          },
        ),
      );
    }

    /*
     * 2. Run SOALL using the latest risk state.
     *
     * This is important:
     * a newly realized loss is visible to G7
     * before another position can be opened.
     */
    const report = runPipeline({
      twin,
      ppg,
      risk: this.risk,
    });

    entries.push(
      this.ledger.appendGateReport(
        tick.ts,
        report,
      ),
    );

    /*
     * 3. Resolve Fusion direction.
     *
     * Direction comes only from:
     *   - explicit directional intent, or
     *   - explicit LOCKED-BULL / LOCKED-BEAR verdict.
     *
     * No direction is manufactured from
     * consensusBull / consensusBear.
     */
    const fusionVerdict =
      input.fusion?.verdict ?? "SILENT";

    const fusionDirection: Side | null =
      fusionVerdict === "LOCKED-BULL"
        ? "long"
        : fusionVerdict === "LOCKED-BEAR"
          ? "short"
          : null;

    const explicitIntent: Side | null =
      input.intent === "long" ||
      input.intent === "short"
        ? input.intent
        : null;

    const dir: Side | null =
      explicitIntent ??
      fusionDirection;

    /*
     * Prevent contradictory explicit intent
     * from overriding a directional Fusion verdict.
     */
    const directionAgrees =
      fusionDirection === null ||
      dir === fusionDirection;

    /*
     * 4. Final execution eligibility.
     *
     * report.allPassed is intentionally NOT used.
     *
     * G2..G6 are quality gates.
     *
     * G1/G7 are safety gates.
     *
     * G8 is final authority.
     */
    const executionAuthorized =
      report.tradeArmed &&
      dir !== null &&
      directionAgrees;

    if (executionAuthorized) {
      entries.push(
        this.ledger.append(
          "ORDER_INTENT",
          tick.ts,
          {
            twinSeq: tick.twinSeq,
            mode: "PAPER",
            price: tick.price,
            intent: dir,
            fusionVerdict,
            soallTradeArmed:
              report.tradeArmed,
            allGatesPassed:
              report.allPassed,
            consecutiveLosses:
              this.risk.consecutiveLosses,
          },
        ),
      );

      const fill = this.paper.open({
        side: dir,
        price: tick.price,
        ts: tick.ts,
        twinSeq: tick.twinSeq,
      });

      if (
        fill &&
        fill.kind === "FILL"
      ) {
        entries.push(
          this.ledger.append(
            "ORDER_FILLED",
            tick.ts,
            {
              id: fill.position.id,
              side: fill.position.side,
              entry: fill.position.entry,
              stop: fill.position.stop,
              target: fill.position.target,
              qty: fill.position.qty,
            },
          ),
        );
      }
    } else {
      /*
       * 5. Record the actual reason execution
       * was not attempted.
       */
      let blockedBy: string;

      let detail: Record<string, unknown>;

      if (report.failedAt) {
        const failedGate =
          report.outcomes.find(
            (o) =>
              o.gate === report.failedAt,
          );

        blockedBy =
          `HARD_VETO:${report.failedAt}`;

        detail = {
          reason:
            failedGate?.reason ?? "",
          hardVeto: true,
          tradeArmed:
            report.tradeArmed,
          consecutiveLosses:
            this.risk.consecutiveLosses,
        };
      } else if (!report.tradeArmed) {
        const authorityOutcome =
          report.outcomes.find(
            (o) =>
              o.gate ===
              "G8_AUTHORITY",
          );

        blockedBy =
          "SOALL_NOT_ARMED";

        detail = {
          tradeArmed:
            report.tradeArmed,
          authorityPassed:
            authorityOutcome?.passed ??
            false,
          composite:
            report.compositeScore,
          threshold:
            report.compositeThreshold,
          consecutiveLosses:
            this.risk.consecutiveLosses,
        };
      } else if (!dir) {
        blockedBy =
          `FUSION:${
            input.fusion?.blocker ??
            "NO_DIRECTION"
          }`;

        detail = {
          verdict: fusionVerdict,
          agreement:
            input.fusion?.agreement,
          consensusBull:
            input.fusion?.consensusBull,
          consensusBear:
            input.fusion?.consensusBear,
          notAxis:
            input.fusion?.notAxis,
          tonAxis:
            input.fusion?.tonAxis,
          notConfidence:
            input.fusion?.notConfidence,
          tonConfidence:
            input.fusion?.tonConfidence,
        };
      } else if (!directionAgrees) {
        blockedBy =
          "FUSION:DIRECTION_CONFLICT";

        detail = {
          fusionVerdict,
          fusionDirection,
          explicitIntent,
          resolvedDirection:
            dir,
        };
      } else {
        blockedBy =
          "PAPER_EXECUTION_REJECTED";

        detail = {
          intent: dir,
          tradeArmed:
            report.tradeArmed,
          fusionVerdict,
        };
      }

      entries.push(
        this.ledger.append(
          "EXEC_BLOCK",
          tick.ts,
          {
            twinSeq: tick.twinSeq,
            blockedBy,
            ...detail,
          },
        ),
      );
    }

    /*
     * 6. T9 state checkpoints.
     */
    const direction =
      dir === "long"
        ? "BULL"
        : dir === "short"
          ? "BEAR"
          : "NEUTRAL";

    tixT9.push(
      checkpoint(
        "FUSION",
        tick.twinSeq,
        {
          direction,
          status: fusionVerdict,
        },
      ),

      checkpoint(
        "SOALL",
        tick.twinSeq,
        {
          direction,
          status: report.tradeArmed
            ? "ARMED"
            : report.failedAt ??
              "STANDBY",
        },
      ),

      checkpoint(
        "RISK_AUTHORITY",
        tick.twinSeq,
        {
          direction,
          status:
            report.failedAt ===
              "G7_RISK" ||
            report.failedAt ===
              "G8_AUTHORITY"
              ? "VETO"
              : "OBSERVED",
        },
      ),

      checkpoint(
        "PAPER_EXECUTION",
        tick.twinSeq,
        {
          direction,
          status:
            this.paper.stats()
              .openPosition
              ? "OPEN"
              : "FLAT",
        },
      ),
    );

    return {
      twin,
      ppg,
      report,
      entries,
      paper: this.paper.stats(),
      tixT9,
    };
  }

  reset(): void {
    this.market.reset();
    this.ledger.reset();
    this.paper.reset();

    this.welford.reset();

    this.risk = {
      drawdownFraction: 0,
      consecutiveLosses: 0,
      systemHealth: "NORMAL",
    };
  }
  }
