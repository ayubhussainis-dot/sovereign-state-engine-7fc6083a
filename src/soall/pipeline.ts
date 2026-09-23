/**
 * SOALL Pipeline
 * --------------------------------------------------------------------
 * G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8
 *
 * Embedded Sovereign Trade Engine
 *
 * NUMERIC CONTRACT
 * --------------------------------------------------------------------
 *
 * Entry:
 *   +0.001 favorable movement from signal
 *
 * Actual Fill:
 *   The price at which entry occurs becomes the trade's zero reference.
 *
 * Win:
 *   +0.300 from actual fill
 *
 * Loss:
 *   -0.300 from actual fill
 *
 * Direction:
 *   Long  → rising price is favorable
 *   Short → falling price is favorable
 *
 * IMPORTANT:
 *   These values use the application's DECIMAL SCALE.
 *   They are NOT converted using *10000.
 *
 * EXECUTION PRINCIPLES
 * --------------------------------------------------------------------
 *
 * 1. Never force a trade.
 * 2. Require the configured entry condition.
 * 3. Treat the actual fill as the zero reference.
 * 4. Protect the position continuously.
 * 5. +0.300 settles as WIN.
 * 6. -0.300 settles as LOSS.
 * 7. Never widen the loss boundary.
 * 8. Never chase a missed entry.
 * 9. Respect G8 authority exits.
 * 10. Respect hard gate vetoes.
 *
 * Contract:
 *   Deterministic · Replay Safe · Self-Contained
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
// TRADE SYSTEM TYPES
// =====================================================================

export type TradeState =
  | "FLAT"
  | "ARMED"
  | "TRAPPING"
  | "OPEN"
  | "MANAGING"
  | "CLOSING";

export type Side =
  | "long"
  | "short";

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
// AUTHORITATIVE NUMERIC CONTRACT
// =====================================================================

/**
 * Entry threshold.
 *
 * Same threshold for LONG and SHORT.
 *
 * The movement must be FAVORABLE to the selected side.
 */
const ENTRY_BPS = 0.001;

/**
 * Winning boundary from ACTUAL FILL.
 */
const TARGET_WIN_BPS = 0.300;

/**
 * Losing boundary from ACTUAL FILL.
 */
const MAX_LOSS_BPS = -0.300;

// =====================================================================
// ENGINE
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

  private readonly debounceWindowMs =
    2000;

  // -------------------------------------------------------------------
  // STATE ACCESS
  // -------------------------------------------------------------------

  getState(): PositionContext {
    return {
      ...this.context,
    };
  }

  getLedger(): readonly TradeCycleRecord[] {
    return this.ledger;
  }

  // -------------------------------------------------------------------
  // DIRECTION
  // -------------------------------------------------------------------

  /**
   * Returns the directional multiplier used throughout the engine.
   *
   * LONG:
   *   price ↑ = favorable
   *
   * SHORT:
   *   price ↓ = favorable
   */
  private getDirectionMultiplier(
    side: Side,
  ): number {
    return side === "long"
      ? 1
      : -1;
  }

  // -------------------------------------------------------------------
  // DECIMAL MOVEMENT
  // -------------------------------------------------------------------

  /**
   * Calculates favorable movement from signal.
   *
   * Result is in the application's decimal scale.
   *
   * Example:
   *
   * LONG:
   *   +0.001 = favorable
   *
   * SHORT:
   *   underlying price falls
   *   normalized result = +0.001
   */
  private calculateFavorableMovement(
    currentPrice: number,
    signalPrice: number,
    side: Side,
  ): number {
    if (
      !signalPrice ||
      !Number.isFinite(signalPrice)
    ) {
      return 0;
    }

    const multiplier =
      this.getDirectionMultiplier(
        side,
      );

    return (
      (
        (
          currentPrice -
          signalPrice
        ) /
        signalPrice
      ) *
      multiplier
    );
  }

  // -------------------------------------------------------------------
  // PNL
  // -------------------------------------------------------------------

  /**
   * Calculates PnL FROM ACTUAL FILL.
   *
   * Application decimal scale:
   *
   *   +0.300 = WIN
   *   -0.300 = LOSS
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
      this.getDirectionMultiplier(
        side,
      );

    return (
      (
        (
          currentPrice -
          entryPrice
        ) /
        entryPrice
      ) *
      multiplier
    );
  }

  // -------------------------------------------------------------------
  // TARGET PRICE
  // -------------------------------------------------------------------

  private calculateTargetPrice(
    entryPrice: number,
    side: Side,
  ): number {
    const multiplier =
      this.getDirectionMultiplier(
        side,
      );

    return (
      entryPrice *
      (
        1 +
        multiplier *
        TARGET_WIN_BPS
      )
    );
  }

  // -------------------------------------------------------------------
  // STOP PRICE
  // -------------------------------------------------------------------

  private calculateStopPrice(
    entryPrice: number,
    side: Side,
  ): number {
    const multiplier =
      this.getDirectionMultiplier(
        side,
      );

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
  // RESET
  // -------------------------------------------------------------------

  private resetToFlat(
    verdict: string,
    agreement: number,
  ): void {
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
  }

  // -------------------------------------------------------------------
  // SETTLEMENT
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

    const pnl =
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
        pnl,

      reason,

      openedAt:
        this.context.openedAt,

      closedAt:
        timestamp,

      ALI3N:
        "SETTLED",
    };

    this.ledger.push(
      record,
    );

    this.resetToFlat(
      verdict,
      agreement,
    );

    return {
      action:
        "CLOSE",

      record,
    };
  }

  // -------------------------------------------------------------------
  // TICK ENGINE
  // -------------------------------------------------------------------

  evaluateTick(
    currentPrice: number,
    timestamp: number,
    verdict: string,
    agreement: number,
    authorityExitReason?:
      string | null,
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
    // PHASE 3 — 0.001 FAVORABLE ENTRY
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
        !Number.isFinite(
          signal,
        )
      ) {
        return {
          action:
            "NONE",
        };
      }

      // --------------------------------------------------------------
      // CANCEL IF SIGNAL COMPLETELY INVERTS
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
        this.resetToFlat(
          verdict,
          agreement,
        );

        return {
          action:
            "NONE",
        };
      }

      // --------------------------------------------------------------
      // FAVORABLE MOVEMENT
      // --------------------------------------------------------------

      const favorableMovement =
        this.calculateFavorableMovement(
          currentPrice,
          signal,
          side,
        );

      // --------------------------------------------------------------
      // ENTRY
      // --------------------------------------------------------------

      if (
        favorableMovement >=
        ENTRY_BPS
      ) {
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
    // PHASE 4 — MANAGE POSITION
    // ================================================================

    if (
      this.context.state ===
        "OPEN" ||
      this.context.state ===
        "MANAGING"
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
      // DIRECT TARGET / STOP DEFENSE
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
      }

      if (
        side === "short"
      ) {
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
// GATE PIPELINE
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

// =====================================================================
// PIPELINE TYPES
// =====================================================================

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
// MAIN PIPELINE
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
  // PRE-TICK ENGINE STATE
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
  // COMPOSITE SCORE
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

  // -------------------------------------------------------------------
  // GATE STATUS
  // -------------------------------------------------------------------

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
  // G8 EXIT SIGNAL
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
      0;

    // ---------------------------------------------------------------
    // POSITION STATE BEFORE EXECUTION
    // ---------------------------------------------------------------

    const positionWasLive =
      liveEngineContext.state ===
        "OPEN" ||
      liveEngineContext.state ===
        "MANAGING";

    // ---------------------------------------------------------------
    // G8 STRATEGIC EXIT
    // ---------------------------------------------------------------

    const strategicExit =
      positionWasLive &&
      authorityExitTriggered
        ? authorityExitReason
        : null;

    // ---------------------------------------------------------------
    // ENGINE TICK
    // ---------------------------------------------------------------

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
          "MANAGING"
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
  // POST-TICK STATE
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
