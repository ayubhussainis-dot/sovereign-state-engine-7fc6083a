/**
 * SOALL Pipeline — Runs G1..G8 in strict sequence with Embedded Sovereign Engine.
 *
 * TEST STRATEGY CONFIGURATION
 * ----------------------------
 * Entry Mechanism:
 *   0.001 entry threshold
 *
 * Risk Management:
 *   Strict symmetric -0.300 maximum loss from fill
 *
 * Target Execution:
 *   +0.300 target from fill
 *
 * Authority:
 *   G8 may explicitly signal a strategic exit.
 *
 * Important:
 *   There is NO 10-BPS delayed entry.
 *   There is NO 1-BPS entry.
 *   There is NO negative entry threshold.
 *   There is NO tipping-point ratchet.
 *   There is NO dip-lock.
 *   There is NO asymmetric loss floor.
 *   There is NO independent +0.240 target.
 *   There is NO independent 60/20 execution configuration.
 *   There is NO inversion-based early exit.
 *
 * Numeric contract:
 *
 *   ENTRY  = +0.001
 *   WIN    = +0.300 from actual fill
 *   LOSS   = -0.300 from actual fill
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

/**
 * AUTHORITATIVE ENTRY VALUE.
 *
 * Same numeric threshold for LONG and SHORT.
 *
 * The actual market price at which this threshold is reached
 * becomes the actual fill / zero reference for the trade.
 */
const ENTRY_BPS = 0.001;

/**
 * AUTHORITATIVE WIN VALUE.
 *
 * Measured FROM ACTUAL FILL.
 *
 * +0.300 = WIN
 */
const TARGET_WIN_BPS = 0.300;

/**
 * AUTHORITATIVE LOSS VALUE.
 *
 * Measured FROM ACTUAL FILL.
 *
 * -0.300 = LOSS
 */
const MAX_LOSS_BPS = -0.300;

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
  // PRICE / PNL CALCULATORS
  // -------------------------------------------------------------------

  /**
   * Returns PnL in the SAME DECIMAL SCALE used by the application.
   *
   * IMPORTANT:
   *
   * There is NO *10000 conversion here.
   *
   * Example:
   *
   *   +0.300 = WIN
   *   -0.300 = LOSS
   *
   * Long:
   *   price rises = positive PnL
   *
   * Short:
   *   price falls = positive PnL
   */
  private calculatePnLBps(
    currentPrice: number,
    entryPrice: number,
    side: Side,
  ): number {
    if (
      !entryPrice ||
      !Number.isFinite(entryPrice)
    ) {
      return 0;
    }

    const multiplier =
      side === "long"
        ? 1
        : -1;

    return (
      (
        (currentPrice - entryPrice) /
        entryPrice
      ) *
      multiplier
    );
  }

  /**
   * Calculates the +0.300 target FROM ACTUAL FILL.
   */
  private calculateTargetPrice(
    entryPrice: number,
    side: Side,
  ): number {
    const multiplier =
      side === "long"
        ? 1
        : -1;

    return (
      entryPrice *
      (
        1 +
        multiplier *
        TARGET_WIN_BPS
      )
    );
  }

  /**
   * Calculates the -0.300 stop FROM ACTUAL FILL.
   */
  private calculateStopPrice(
    entryPrice: number,
    side: Side,
  ): number {
    const multiplier =
      side === "long"
        ? 1
        : -1;

    return (
      entryPrice *
      (
        1 +
        multiplier *
        MAX_LOSS_BPS
      )
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
    const side =
      this.context.side!;

    const entry =
      this.context.entryPrice;

    const currentPnLBps =
      this.calculatePnLBps(
        currentPrice,
        entry,
        side,
      );

    this.context.state =
      "CLOSING";

    const record: TradeCycleRecord = {
      id:
        `cycle-${Date.now()}`,

      side,

      signalPrice:
        this.context.signalPrice,

      entryPrice:
        entry,

      exitPrice:
        currentPrice,

      pnlBps:
        currentPnLBps,

      reason,

      openedAt:
        this.context.openedAt,

      closedAt:
        timestamp,

      ALI3N:
        "SETTLED",
    };

    this.ledger.push(record);

    this.context = {
      state:
        "FLAT",

      side:
        null,

      signalPrice:
        0,

      entryPrice:
        0,

      size:
        1.0,

      targetPrice:
        0,

      stopPrice:
        0,

      openedAt:
        0,

      fusionSnapshot: {
        verdict,
        agreement,
      },

      ALI3N:
        "ACTIVE",
    };

    return {
      action:
        "CLOSE",

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
    authorityExitReason?: string | null,
  ): {
    action:
      | "NONE"
      | "OPEN"
      | "CLOSE";

    record?:
      TradeCycleRecord;
  } {
    const isBull =
      verdict ===
      "LOCKED-BULL";

    const isBear =
      verdict ===
      "LOCKED-BEAR";

    // ================================================================
    // PHASE 1 — ARM
    // ================================================================

    if (
      timestamp -
        this.lastVerdictChange >
      this.debounceWindowMs
    ) {
      if (
        this.context.state ===
          "FLAT" &&
        (isBull || isBear) &&
        agreement > 0.75
      ) {
        this.context.state =
          "ARMED";

        this.lastVerdictChange =
          timestamp;
      }
    }

    // ================================================================
    // PHASE 2 — CREATE SIGNAL
    // ================================================================

    if (
      this.context.state ===
      "ARMED"
    ) {
      const side: Side =
        isBull
          ? "long"
          : "short";

      this.context = {
        ...this.context,

        state:
          "TRAPPING",

        side,

        signalPrice:
          currentPrice,

        entryPrice:
          0,

        targetPrice:
          0,

        stopPrice:
          0,

        openedAt:
          timestamp,

        fusionSnapshot: {
          verdict,
          agreement,
        },
      };

      return {
        action:
          "NONE",
      };
    }

    // ================================================================
    // PHASE 3 — 0.001 ENTRY
    // ================================================================

    if (
      this.context.state ===
      "TRAPPING"
    ) {
      const side =
        this.context.side!;

      const signal =
        this.context.signalPrice;

      if (
        !signal ||
        !Number.isFinite(signal)
      ) {
        return {
          action:
            "NONE",
        };
      }

      /**
       * ENTRY USES THE APPLICATION'S DECIMAL SCALE.
       *
       * Same ENTRY_BPS value for both LONG and SHORT.
       *
       * No *10000.
       * No +1.
       * No -1.
       *
       * The magnitude of movement from the signal must reach 0.001.
       */
      const movement =
        Math.abs(
          (
            currentPrice -
            signal
          ) /
          signal
        );

      // --------------------------------------------------------------
      // Opposite signal cancels pending entry
      // --------------------------------------------------------------

      if (
        (
          side === "long" &&
          isBear
        ) ||
        (
          side === "short" &&
          isBull
        )
      ) {
        this.context.state =
          "FLAT";

        this.context.side =
          null;

        return {
          action:
            "NONE",
        };
      }

      // --------------------------------------------------------------
      // 0.001 ENTRY
      // --------------------------------------------------------------

      if (
        movement >=
        ENTRY_BPS
      ) {
        /**
         * ACTUAL FILL.
         *
         * This price becomes the zero reference
         * for all subsequent PnL calculations.
         */
        const entryPrice =
          currentPrice;

        this.context = {
          ...this.context,

          state:
            "OPEN",

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

          openedAt:
            timestamp,
        };

        return {
          action:
            "OPEN",
        };
      }

      return {
        action:
          "NONE",
      };
    }

    // ================================================================
    // PHASE 4 — MANAGE OPEN POSITION
    // ================================================================

    if (
      this.context.state ===
        "OPEN" ||
      this.context.state ===
        "MANAGING" ||
      this.context.state ===
        "HOLDING_STRETCH"
    ) {
      if (
        this.context.state ===
        "OPEN"
      ) {
        this.context.state =
          "MANAGING";
      }

      const side =
        this.context.side!;

      const entry =
        this.context.entryPrice;

      const currentPnLBps =
        this.calculatePnLBps(
          currentPrice,
          entry,
          side,
        );

      // ==============================================================
      // G8 AUTHORITY EXIT
      // ==============================================================

      if (
        authorityExitReason
      ) {
        return this.settlePosition(
          currentPrice,
          timestamp,
          verdict,
          agreement,
          `G8_AUTHORITY_EXIT · ${authorityExitReason}`,
        );
      }

      // ==============================================================
      // +0.300 = WIN
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
          `TARGET_0.300_SECURED (${currentPnLBps.toFixed(4)})`,
        );
      }

      // ==============================================================
      // -0.300 = LOSS
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
          `MAX_LOSS_0.300_REACHED (${currentPnLBps.toFixed(4)})`,
        );
      }

      // ==============================================================
      // DIRECT PRICE TARGET / STOP DEFENSE
      //
      // These correspond exactly to:
      //
      //   +0.300 WIN
      //   -0.300 LOSS
      //
      // calculated from the actual fill.
      // ==============================================================

      if (
        side === "long"
      ) {
        if (
          currentPrice >=
          this.context.targetPrice
        ) {
          return this.settlePosition(
            currentPrice,
            timestamp,
            verdict,
            agreement,
            `TARGET_0.300_SECURED (${currentPnLBps.toFixed(4)})`,
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
            `MAX_LOSS_0.300_REACHED (${currentPnLBps.toFixed(4)})`,
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
            `TARGET_0.300_SECURED (${currentPnLBps.toFixed(4)})`,
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
            `MAX_LOSS_0.300_REACHED (${currentPnLBps.toFixed(4)})`,
          );
        }
      }
    }

    return {
      action:
        "NONE",
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

const PIPELINE:
  readonly Gate[] = [
    g1Synchrony,
    g2Structure,
    g3Confluence,
    g4Pattern,
    g5Examination,
    g6Confidence,
    g7Risk,
    g8Authority,
  ];

const COMPOSITE_THRESHOLD =
  0.0;

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

  currentPositionState:
    string;
}

// =====================================================================
// MAIN GATE PIPELINE EXECUTION
// =====================================================================

export function runPipeline(
  inputs: PipelineInputs,
): ExtendedGateReport {
  const outcomes:
    GateOutcome[] = [];

  const priorPasses:
    GateId[] = [];

  let failedAt:
    GateId | null =
    null;

  // -------------------------------------------------------------------
  // CURRENT ENGINE STATE BEFORE THIS TICK
  // -------------------------------------------------------------------

  const liveEngineContext =
    localPipelineStateMachine
      .getState();

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

  for (
    const gate of PIPELINE
  ) {
    const gateInputs:
      GateInputs = {
        twin:
          inputs.twin,

        ppg:
          inputs.ppg,

        risk:
          inputs.risk,

        priorPasses:
          priorPasses.slice(),
      };

    const outcome =
      gate(
        gateInputs,
      );

    outcomes.push(
      outcome,
    );

    if (
      !outcome.passed &&
      outcome.hardVeto &&
      failedAt === null
    ) {
      failedAt =
        outcome.gate;
    }

    if (
      outcome.passed
    ) {
      priorPasses.push(
        outcome.gate,
      );
    }
  }

  // -------------------------------------------------------------------
  // COMPOSITE
  // -------------------------------------------------------------------

  let weightSum =
    0;

  let weighted =
    0;

  for (
    const outcome of outcomes
  ) {
    weightSum +=
      outcome.weight;

    weighted +=
      outcome.weight *
      outcome.score;
  }

  const compositeScore =
    weightSum > 0
      ? weighted /
        weightSum
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

  const authorityEvidence =
    authorityOutcome?.evidence as
      | {
          exitTriggered?:
            boolean;
          exitReason?:
            string;
        }
      | undefined;

  const authorityExitTriggered =
    authorityEvidence
      ?.exitTriggered ===
    true;

  const authorityExitReason =
    authorityEvidence
      ?.exitReason ||
    "G8_EXIT";

  // -------------------------------------------------------------------
  // EXECUTION
  // -------------------------------------------------------------------

  let engineAction:
    | "NONE"
    | "OPEN"
    | "CLOSE" =
    "NONE";

  if (
    inputs.twin?.last
  ) {
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
    // Only pass G8 exit when a position was already live.
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
      localPipelineStateMachine
        .evaluateTick(
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
    // A live position may still be settled by a hard gate veto.
    // ---------------------------------------------------------------

    if (
      engineAction ===
        "NONE" &&
      !tradeArmed &&
      positionWasLive
    ) {
      const currentState =
        localPipelineStateMachine
          .getState();

      if (
        currentState.state ===
          "OPEN" ||
        currentState.state ===
          "MANAGING" ||
        currentState.state ===
          "HOLDING_STRETCH"
      ) {
        const forcedResult =
          localPipelineStateMachine
            .evaluateTick(
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
    localPipelineStateMachine
      .getState();

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
