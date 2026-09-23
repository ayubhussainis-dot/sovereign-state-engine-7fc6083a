/**
 * SOALL Pipeline — Runs G1..G8 in strict sequence.
 *
 * Architecture Matrix:
 *   G1 = Safety Veto (Synchrony & Trapping Boundary)
 *   G2 = Quality Check (Market Structure Regime)
 *   G3 = Quality Check (Order Flow Confluence)
 *   G4 = Quality Check (Pattern Friction Control)
 *   G5 = Quality Check (Velocity Diagnostics)
 *   G6 = Quality Check (Confidence Scoring)
 *   G7 = Safety Veto (Drawdown & Asymmetric Loss Floor)
 *   G8 = Final Execution Authority & Profit Ratchet
 *
 * G2..G6 are quality gates. They can fail without independently blocking execution.
 *
 * Contract:
 *   Deterministic · Pure · Replay Safe.
 */

import { g1Synchrony } from "./gates/g1-synchrony";
import { g2Structure } from "./gates/g2-structure";
import { g3Confluence } from "./gates/g3-confluence";
import { g4Pattern } from "./gates/g4-pattern";
import { g5Examination } from "./gates/g5-examination";
import { g6Confidence } from "./gates/g6-confidence";
import { g7Risk } from "./gates/g7-risk";
import { g8Authority } from "./gates/g8-authority";

// Import your unified Sovereign State Machine
import { tradeStateMachine } from "@/lib/trade-state-machine";

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

// Extended return interface to expose the State Machine actions to your broker service
export interface ExtendedGateReport extends GateReport {
  engineAction: "NONE" | "OPEN" | "CLOSE";
  currentPositionState: string;
}

export function runPipeline(
  inputs: PipelineInputs,
): ExtendedGateReport {
  const outcomes: GateOutcome[] = [];

  /*
   * Stores gates that actually passed.
   * G8 uses this vector to verify the mandatory safety gates G1 and G7.
   */
  const priorPasses: GateId[] = [];

  /*
   * First genuine hard-veto failure tracker.
   */
  let failedAt: GateId | null = null;

  /*
   * =====================================================================
   * SOVEREIGN CONTEXT PRE-PROCESSING
   * =====================================================================
   * Before running the gate evaluations, we inject the State Machine's 
   * live position context directly into the input parameters. This allows 
   * G1, G2, G5, G6, G7, and G8 to dynamically adjust their thresholds 
   * based on whether we are currently FLAT, TRAPPING, or OPEN.
   */
  const liveEngineContext = tradeStateMachine.getState();
  inputs.risk.positionState = liveEngineContext.state;
  inputs.risk.positionSide = liveEngineContext.side;
  inputs.risk.entryPrice = liveEngineContext.entryPrice;
  inputs.risk.signalPrice = liveEngineContext.signalPrice;
  inputs.risk.currentPrice = inputs.twin.last?.price || inputs.twin.last?.close || 0;

  /*
   * Run G1 through G8 in strict, immutable order.
   * Every gate runs so the complete audit report remains fully available
   * in the database ledger even when a safety gate fails.
   */
  for (const gate of PIPELINE) {
    const gateInputs: GateInputs = {
      twin: inputs.twin,
      ppg: inputs.ppg,
      risk: inputs.risk,
      priorPasses: priorPasses.slice(),
    };

    const outcome = gate(gateInputs);
    outcomes.push(outcome);

    /*
     * Record the first actual hard-veto safety failure.
     */
    if (
      !outcome.passed &&
      outcome.hardVeto &&
      failedAt === null
    ) {
      failedAt = outcome.gate;
    }

    /*
     * Only passed gates enter the cumulative pass vector.
     */
    if (outcome.passed) {
      priorPasses.push(outcome.gate);
    }
  }

  /*
   * Calculate the diagnostic weighted composite score.
   */
  let weightSum = 0;
  let weighted = 0;

  for (const outcome of outcomes) {
    weightSum += outcome.weight;
    weighted += outcome.weight * outcome.score;
  }

  const compositeScore = weightSum > 0 ? weighted / weightSum : 0;

  /*
   * Informational validation status only.
   */
  const allGatesPassed =
    outcomes.length === PIPELINE.length &&
    outcomes.every((outcome) => outcome.passed);

  /*
   * G8 check to verify authority signature alignment.
   */
  const authorityOutcome = outcomes.find(
    (outcome) => outcome.gate === "G8_AUTHORITY",
  );
  const authorityPassed = authorityOutcome?.passed === true;

  /*
   * Base trade readiness value (Green-Light Flag)
   */
  const tradeArmed =
    authorityPassed &&
    failedAt === null &&
    compositeScore >= COMPOSITE_THRESHOLD;

  /*
   * =====================================================================
   * SOVEREIGN TICK EVALUATION LOOP (Continuous Processing Execution)
   * =====================================================================
   * We pull this block OUTSIDE the 'if (tradeArmed)' barrier.
   * This guarantees that the tick flows through the state machine on
   * every single millisecond calculation pass, allowing exits to trigger
   * instantly when stop boundaries are hit, regardless of gate statuses.
   */
  let engineAction: "NONE" | "OPEN" | "CLOSE" = "NONE";

  if (inputs.twin?.last) {
    const currentPrice = inputs.twin.last.price || inputs.twin.last.close || 0;
    const timestamp = Date.now();
    
    // Extract real-time lens consensus from your PPG snapshot metrics
    const verdict = inputs.ppg?.verdict || "SILENT";
    const agreement = inputs.ppg?.agreement || 0.0;

    // Send the execution vector straight through the state machine logic parameters
    const stateResult = tradeStateMachine.evaluateTick(
      currentPrice,
      timestamp,
      verdict,
      agreement,
      60, // Target BPS parameters (Widen to accommodate +24 bps macro target)
      20  // Stop BPS parameters (Widen to accommodate -10 bps risk floor)
    );

    // Capture the state machine's real command
    engineAction = stateResult.action;

    // Override loop: If the gate system has completely revoked trade permission due to a 
    // network failure or macro drawdown veto, force the position to liquidate immediately.
    if (!tradeArmed && (liveEngineContext.state === "OPEN" || liveEngineContext.state === "MANAGING" || liveEngineContext.state === "HOLDING_STRETCH")) {
      engineAction = "CLOSE";
      console.log("🛑 [GLOBAL SYSTEM VETO]: Pipeline revoked execution permissions. Force-liquidating position.");
    }

    if (engineAction === "OPEN") {
      console.log("🚀 [SOVEREIGN TRAP SPRUNG]: Crowd panic hit 10 bps threshold. Firing true entry.");
    } else if (engineAction === "CLOSE") {
      console.log(`🔒 [WAVE SETTLED]: Position cleared cleanly. Engine Reason: ${stateResult.record?.reason || "Pipeline Sync Drop"}`);
    }
  }

  return {
    outcomes,
    failedAt,
    allPassed: allGatesPassed,
    compositeScore,
    tradeArmed,
    compositeThreshold: COMPOSITE_THRESHOLD,
    twinSeq: inputs.twin.last?.twinSeq ?? -1,
    
    // Asymmetric data additions passed up to your app container UI
    engineAction,
    currentPositionState: tradeStateMachine.getState().state
  };
}
