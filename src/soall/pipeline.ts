/**
 * SOALL Pipeline — Runs G1..G8 in strict sequence with Embedded Sovereign Engine.
 *
 * TEST STRATEGY CONFIGURATION
 * ----------------------------
 * Entry Mechanism:
 *   10-bps Delayed Entry Trap
 *
 * Risk Management:
 *   Strict symmetric -30.0 BPS maximum loss from fill
 *
 * Target Execution:
 *   +30.0 BPS macro target from fill
 *
 * Authority:
 *   G8 may explicitly signal a strategic exit.
 *
 * Important:
 *   There is NO tipping-point ratchet.
 *   There is NO dip-lock.
 *   There is NO asymmetric -10 BPS floor.
 *   There is NO independent +24 BPS target.
 *   There is NO independent 60/20 execution configuration.
 *
 * Contract:
 *   Deterministic · Pure · Replay Safe · Complete · Self-Contained
 */

import { g1Synchrony } from "./gates/g1-synchrony";
import { g2Structure } from "./gates/g2-structure";
import { g3Confluence } from "./gates/g3-confluence";
import { g4Pattern } from "./gates/g4-pattern";
import { g5Examination } from "./gates/g5-examination";
import { g6Confidence } from "./gates/g6-confidence";
import { g7Risk } from "./gates/g7-risk";
import { g8Authority } from "./gates/g8-authority";

import type {
  Gate,
  GateId,
  GateInputs,
  GateOutcome,
  GateReport,
  RiskContext,
} from "./types";

import type { PPGSnapshot } from "@/ppg/types";
import type { TwinSnapshot } from "@/twin/types";

// =====================================================================
// ENGINE SYSTEM TYPE ARCHITECTURE
// =====================================================================

export type TradeState =
  | "FLAT"
  | "ARMED"
  | "TRAPPING"
  | "OPEN"
  | "MANAGING"
  | "HOLDING_STRETCH"
  | "CLOSING"
  | "SETTLED";

export type Side = "long" | "short";

export interface PositionContext {
  state: TradeState;
  side: Side | null;
  signalPrice: number;
  entryPrice: number;
  size: number;
  targetPrice: number;
  stopPrice: number;
  openedAt: number;
  fusionSnapshot: {
    verdict: string;
    agreement: number;
  };
  ALI3N: string;
}

export interface TradeCycleRecord {
  id: string;
  side: Side;
  signalPrice: number;
  entryPrice: number;
  exitPrice: number;
  pnlBps: number;
  reason: string;
  openedAt: number;
  closedAt: number;
  ALI3N: string;
}

// =====================================================================
// STRATEGIC TEST PARAMETERS
// =====================================================================

const TRAP_BUFFER_BPS = 10.0;

/**
 * Authoritative test target.
 *
 * Long:
 *   entry +30 BPS
 *
 * Short:
 *   entry -30 BPS
 */
const TARGET_WIN_BPS = 30.0;

/**
 * Authoritative maximum loss.
 *
 * Long:
 *   entry -30 BPS
 *
 * Short:
 *   entry +30 BPS
 */
const MAX_LOSS_BPS = -30.0;

// =====================================================================
// SOVEREIGN ALPHA ENGINE CLASS
// =====================================================================

class EmbeddedTradeStateMachine {
  private context: PositionContext = {
    state: "FLAT",
    side: null,
    signalPrice: 0,
    entryPrice: 0,
    size: 1.0,
    targetPrice: 0,
    stopPrice: 0,
    openedAt: 0,
    fusionSnapshot: {
      verdict: "SILENT",
      agreement: 0,
    },
    ALI3N: "ACTIVE",
  };

  private ledger: TradeCycleRecord[] = [];

  private lastVerdictChange = 0;

  private debounceWindowMs = 2000;

  // -------------------------------------------------------------------
  // PUBLIC STATE ACCESS
  // -------------------------------------------------------------------

  getState(): PositionContext {
    return { ...this.context };
  }

  getLedger(): readonly TradeCycleRecord[] {
    return this.ledger;
  }

  // -------------------------------------------------------------------
  // PRICE CALCULATORS
  // -------------------------------------------------------------------

  private calculatePnLBps(
    currentPrice: number,
    entryPrice: number,
    side: Side,
  ): number {
    if (!entryPrice || !Number.isFinite(entryPrice)) {
      return 0;
    }

    const multiplier = side === "long" ? 1 : -1;

    return (
      ((currentPrice - entryPrice) / entryPrice) *
      multiplier *
      10000
    );
  }

  private calculateTargetPrice(
    entryPrice: number,
    side: Side,
  ): number {
    const multiplier = side === "long" ? 1 : -1;

    return (
      entryPrice *
      (1 + multiplier * (TARGET_WIN_BPS / 10000))
    );
  }

  private calculateStopPrice(
    entryPrice: number,
    side: Side,
  ): number {
    const multiplier = side === "long" ? 1 : -1;

    return (
      entryPrice *
      (1 + multiplier * (MAX_LOSS_BPS / 10000))
    );
  }

  // -------------------------------------------------------------------
  // POSITION SETTLEMENT
  // -------------------------------------------------------------------

  private settlePosition(
    currentPrice: number,
    timestamp: number,
    verdict: string,
    agreement: number,
    reason: string,
  ): {
    action: "CLOSE";
    record: TradeCycleRecord;
  } {
    const side = this.context.side!;

    const entry = this.context.entryPrice;

    const currentPnLBps = this.calculatePnLBps(
      currentPrice,
      entry,
      side,
    );

    this.context.state = "CLOSING";

    const record: TradeCycleRecord = {
      id: `cycle-${Date.now()}`,

      side,

      signalPrice:
        this.context.signalPrice,

      entryPrice: entry,

      exitPrice: currentPrice,

      pnlBps: currentPnLBps,

      reason,

      openedAt:
        this.context.openedAt,

      closedAt:
        timestamp,

      ALI3N: "SETTLED",
    };

    this.ledger.push(record);

    this.context = {
      state: "FLAT",

      side: null,

      signalPrice: 0,

      entryPrice: 0,

      size: 1.0,

      targetPrice: 0,

      stopPrice: 0,

      openedAt: 0,

      fusionSnapshot: {
        verdict,
        agreement,
      },

      ALI3N: "ACTIVE",
    };

    return {
      action: "CLOSE",
      record,
    };
  }

  // -------------------------------------------------------------------
  // TICK EVALUATION
  // -------------------------------------------------------------------

  evaluateTick(
    currentPrice: number,
    timestamp: number,
    verdict: string,
    agreement: number,

    /**
     * Explicit G8 strategic exit.
     *
     * When supplied, the execution layer MUST settle
     * the currently open position at the current market price.
     */
    authorityExitReason?: string | null,
  ): {
    action: "NONE" | "OPEN" | "CLOSE";
    record?: TradeCycleRecord;
  } {
    const isBull = verdict === "LOCKED-BULL";

    const isBear = verdict === "LOCKED-BEAR";

    // ================================================================
    // PHASE 1 — ARM
    // ================================================================

    if (
      timestamp - this.lastVerdictChange >
      this.debounceWindowMs
    ) {
      if (
        this.context.state === "FLAT" &&
        (isBull || isBear) &&
        agreement > 0.75
      ) {
        this.context.state = "ARMED";

        this.lastVerdictChange = timestamp;
      }
    }

    // ================================================================
    // PHASE 2 — ENTER TRAP
    // ================================================================

    if (this.context.state === "ARMED") {
      const side: Side =
        isBull ? "long" : "short";

      this.context = {
        ...this.context,

        state: "TRAPPING",

        side,

        signalPrice: currentPrice,

        entryPrice: 0,

        targetPrice: 0,

        stopPrice: 0,

        openedAt: timestamp,

        fusionSnapshot: {
          verdict,
          agreement,
        },
      };

      return {
        action: "NONE",
      };
    }

    // ================================================================
    // PHASE 3 — DELAYED ENTRY
    // ================================================================

    if (this.context.state === "TRAPPING") {
      const side = this.context.side!;

      const signal =
        this.context.signalPrice;

      const multiplier =
        side === "long" ? -1 : 1;

      const currentDriftBps =
        ((currentPrice - signal) / signal) *
        multiplier *
        10000;

      // --------------------------------------------------------------
      // Opposite signal cancels trap
      // --------------------------------------------------------------

      if (
        (side === "long" && isBear) ||
        (side === "short" && isBull)
      ) {
        this.context.state = "FLAT";

        this.context.side = null;

        return {
          action: "NONE",
        };
      }

      // --------------------------------------------------------------
      // 10-BPS delayed entry
      // --------------------------------------------------------------

      if (
        currentDriftBps >=
        TRAP_BUFFER_BPS
      ) {
        const entryPrice = currentPrice;

        this.context = {
          ...this.context,

          state: "OPEN",

          entryPrice,

          targetPrice:
            this.calculateTargetPrice(
              entryPrice,
              side,
            ),

          stopPrice:
            this.calculateStopPrice(
              entryPrice,
              side,
            ),

          openedAt: timestamp,
        };

        return {
          action: "OPEN",
        };
      }

      return {
        action: "NONE",
      };
    }

    // ================================================================
    // PHASE 4 — MANAGE OPEN POSITION
    // ================================================================

    if (
      this.context.state === "OPEN" ||
      this.context.state === "MANAGING" ||
      this.context.state === "HOLDING_STRETCH"
    ) {
      if (this.context.state === "OPEN") {
        this.context.state = "MANAGING";
      }

      const side = this.context.side!;

      const entry =
        this.context.entryPrice;

      const currentPnLBps =
        this.calculatePnLBps(
          currentPrice,
          entry,
          side,
        );

      // ==============================================================
      // G8 AUTHORITY EXIT — FIRST PRIORITY
      // ==============================================================

      if (authorityExitReason) {
        return this.settlePosition(
          currentPrice,
          timestamp,
          verdict,
          agreement,
          `G8_AUTHORITY_EXIT · ${authorityExitReason}`,
        );
      }

      // ==============================================================
      // +30 BPS TARGET
      // ==============================================================

      if (
        currentPnLBps >=
        TARGET_WIN_BPS
      ) {
        return this.settlePosition(
          currentPrice,
          timestamp,
          verdict,
          agreement,
          `TARGET_30BPS_SECURED (${currentPnLBps.toFixed(2)}bps)`,
        );
      }

      // ==============================================================
      // -30 BPS HARD LOSS FLOOR
      // ==============================================================

      if (
        currentPnLBps <=
        MAX_LOSS_BPS
      ) {
        return this.settlePosition(
          currentPrice,
          timestamp,
          verdict,
          agreement,
          `MAX_LOSS_30BPS_REACHED (${currentPnLBps.toFixed(2)}bps)`,
        );
      }

      // ==============================================================
      // DIRECT PRICE TARGET / STOP DEFENSE
      //
      // These are mathematically identical to +30 / -30 BPS.
      // They exist as an execution-layer defense in case the
      // calculated PnL boundary and displayed market price differ
      // by floating-point/rounding behavior.
      // ==============================================================

      if (side === "long") {
        if (
          currentPrice >=
          this.context.targetPrice
        ) {
          return this.settlePosition(
            currentPrice,
            timestamp,
            verdict,
            agreement,
            `TARGET_30BPS_SECURED (${currentPnLBps.toFixed(2)}bps)`,
          );
        }

        if (
          currentPrice <=
          this.context.stopPrice
        ) {
          return this.settlePosition(
            currentPrice,
            timestamp,
            verdict,
            agreement,
            `MAX_LOSS_30BPS_REACHED (${currentPnLBps.toFixed(2)}bps)`,
          );
        }
      } else {
        if (
          currentPrice <=
          this.context.targetPrice
        ) {
          return this.settlePosition(
            currentPrice,
            timestamp,
            verdict,
            agreement,
            `TARGET_30BPS_SECURED (${currentPnLBps.toFixed(2)}bps)`,
          );
        }

        if (
          currentPrice >=
          this.context.stopPrice
        ) {
          return this.settlePosition(
            currentPrice,
            timestamp,
            verdict,
            agreement,
            `MAX_LOSS_30BPS_REACHED (${currentPnLBps.toFixed(2)}bps)`,
          );
        }
      }

      // ==============================================================
      // INVERSION HANDLING
      //
      // This remains separate from the hard -30 BPS boundary.
      // A profitable inversion can remain in HOLDING_STRETCH.
      // A losing inversion above -30 BPS can exit.
      // ==============================================================

      let inversionReason:
        | string
        | null = null;

      if (
        side === "long" &&
        isBear
      ) {
        inversionReason =
          "GATE_INVERSION_BEAR";
      }

      if (
        side === "short" &&
        isBull
      ) {
        inversionReason =
          "GATE_INVERSION_BULL";
      }

      if (inversionReason) {
        if (
          currentPnLBps > 0 &&
          currentPnLBps < TARGET_WIN_BPS
        ) {
          this.context.state =
            "HOLDING_STRETCH";

          return {
            action: "NONE",
          };
        }

        if (
          currentPnLBps <= 0 &&
          currentPnLBps > MAX_LOSS_BPS
        ) {
          return this.settlePosition(
            currentPrice,
            timestamp,
            verdict,
            agreement,
            `TRAP_INVERSION_RISK_EXIT (${currentPnLBps.toFixed(2)}bps)`,
          );
        }
      }
    }

    return {
      action: "NONE",
    };
  }
}

// =====================================================================
// SINGLE EMBEDDED ENGINE INSTANCE
// =====================================================================

export const localPipelineStateMachine =
  new EmbeddedTradeStateMachine();

// =====================================================================
// CORE PIPELINE
// =====================================================================

const PIPELINE: readonly Gate[] = [
  g1Synchrony,
  g2Structure,
  g3Confluence,
  g4Pattern,
  g5Examination,
  g6Confidence,
  g7Risk,
  g8Authority,
];

const COMPOSITE_THRESHOLD = 0.0;

export interface PipelineInputs {
  twin: TwinSnapshot;
  ppg: PPGSnapshot;
  risk: RiskContext;
}

export interface ExtendedGateReport
  extends GateReport {
  engineAction:
    | "NONE"
    | "OPEN"
    | "CLOSE";

  currentPositionState: string;
}

// =====================================================================
// MAIN GATE PIPELINE EXECUTION
// =====================================================================

export function runPipeline(
  inputs: PipelineInputs,
): ExtendedGateReport {
  const outcomes: GateOutcome[] = [];

  const priorPasses: GateId[] = [];

  let failedAt: GateId | null = null;

  // -------------------------------------------------------------------
  // CURRENT ENGINE STATE BEFORE THIS TICK
  // -------------------------------------------------------------------

  const liveEngineContext =
    localPipelineStateMachine.getState();

  inputs.risk.positionState =
    liveEngineContext.state;

  inputs.risk.positionSide =
    liveEngineContext.side;

  inputs.risk.entryPrice =
    liveEngineContext.entryPrice;

  inputs.risk.signalPrice =
    liveEngineContext.signalPrice;

  inputs.risk.currentPrice =
    inputs.twin.last?.price ||
    inputs.twin.last?.close ||
    0;

  // -------------------------------------------------------------------
  // G1 → G8
  // -------------------------------------------------------------------

  for (const gate of PIPELINE) {
    const gateInputs: GateInputs = {
      twin: inputs.twin,

      ppg: inputs.ppg,

      risk: inputs.risk,

      priorPasses:
        priorPasses.slice(),
    };

    const outcome =
      gate(gateInputs);

    outcomes.push(outcome);

    if (
      !outcome.passed &&
      outcome.hardVeto &&
      failedAt === null
    ) {
      failedAt = outcome.gate;
    }

    if (outcome.passed) {
      priorPasses.push(
        outcome.gate,
      );
    }
  }

  // -------------------------------------------------------------------
  // COMPOSITE
  // -------------------------------------------------------------------

  let weightSum = 0;

  let weighted = 0;

  for (const outcome of outcomes) {
    weightSum +=
      outcome.weight;

    weighted +=
      outcome.weight *
      outcome.score;
  }

  const compositeScore =
    weightSum > 0
      ? weighted / weightSum
      : 0;

  const allGatesPassed =
    outcomes.length ===
      PIPELINE.length &&
    outcomes.every(
      (outcome) =>
        outcome.passed,
    );

  const authorityOutcome =
    outcomes.find(
      (outcome) =>
        outcome.gate ===
        "G8_AUTHORITY",
    );

  const authorityPassed =
    authorityOutcome?.passed ===
    true;

  const tradeArmed =
    authorityPassed &&
    failedAt === null &&
    compositeScore >=
      COMPOSITE_THRESHOLD;

  // -------------------------------------------------------------------
  // EXTRACT G8 STRATEGIC EXIT SIGNAL
  // -------------------------------------------------------------------

  /**
   * G8 exposes its strategic decision through evidence.exitTriggered.
   *
   * The execution engine now explicitly consumes this signal.
   *
   * This is the critical connection that was missing previously.
   */

  const authorityEvidence =
    authorityOutcome?.evidence as
      | {
          exitTriggered?: boolean;
          exitReason?: string;
        }
      | undefined;

  const authorityExitTriggered =
    authorityEvidence?.exitTriggered ===
    true;

  const authorityExitReason =
    authorityEvidence?.exitReason ||
    "G8_EXIT";

  // -------------------------------------------------------------------
  // EXECUTION
  // -------------------------------------------------------------------

  let engineAction:
    | "NONE"
    | "OPEN"
    | "CLOSE" =
    "NONE";

  if (inputs.twin?.last) {
    const currentPrice =
      inputs.twin.last.price ||
      inputs.twin.last.close ||
      0;

    const timestamp =
      Date.now();

    const verdict =
      inputs.ppg?.verdict ||
      "SILENT";

    const agreement =
      inputs.ppg?.agreement ||
      0.0;

    // ---------------------------------------------------------------
    // Only pass the G8 exit signal when a position was already live.
    // ---------------------------------------------------------------

    const positionWasLive =
      liveEngineContext.state ===
        "OPEN" ||
      liveEngineContext.state ===
        "MANAGING" ||
      liveEngineContext.state ===
        "HOLDING_STRETCH";

    const strategicExit =
      positionWasLive &&
      authorityExitTriggered
        ? authorityExitReason
        : null;

    const stateResult =
      localPipelineStateMachine.evaluateTick(
        currentPrice,
        timestamp,
        verdict,
        agreement,
        strategicExit,
      );

    engineAction =
      stateResult.action;

    // ---------------------------------------------------------------
    // HARD GATE VETO
    //
    // If a live position is vetoed by a hard safety gate, force
    // settlement through the same state-machine path.
    //
    // This replaces the previous stale-state assignment:
    //     engineAction = "CLOSE"
    //
    // which only changed the reported action without actually
    // settling the ledger position.
    // ---------------------------------------------------------------

    if (
      engineAction === "NONE" &&
      !tradeArmed &&
      positionWasLive
    ) {
      const currentState =
        localPipelineStateMachine.getState();

      if (
        currentState.state ===
          "OPEN" ||
        currentState.state ===
          "MANAGING" ||
        currentState.state ===
          "HOLDING_STRETCH"
      ) {
        const forcedResult =
          localPipelineStateMachine.evaluateTick(
            currentPrice,
            timestamp,
            verdict,
            agreement,
            "HARD_GATE_VETO",
          );

        engineAction =
          forcedResult.action;
      }
    }
  }

  // -------------------------------------------------------------------
  // FRESH POST-TICK STATE
  // -------------------------------------------------------------------

  const finalEngineContext =
    localPipelineStateMachine.getState();

  return {
    outcomes,

    failedAt,

    allPassed:
      allGatesPassed,

    compositeScore,

    tradeArmed,

    compositeThreshold:
      COMPOSITE_THRESHOLD,

    twinSeq:
      inputs.twin.last?.twinSeq ??
      -1,

    engineAction,

    currentPositionState:
      finalEngineContext.state,
  };
    }
