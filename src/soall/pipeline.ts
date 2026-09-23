/**
 * SOALL Pipeline — Runs G1..G8 in strict sequence with External Sovereign Engine.
 */

import { g1Synchrony } from "./gates/g1-synchrony";
import { g2Structure } from "./gates/g2-structure";
import { g3Confluence } from "./gates/g3-confluence";
import { g4Pattern } from "./gates/g4-pattern";
import { g5Examination } from "./gates/g5-examination";
import { g6Confidence } from "./gates/g6-confidence";
import { g7Risk } from "./gates/g7-risk";
import { g8Authority } from "./gates/g8-authority";
import { localPipelineStateMachine } from "./sovereign-engine";

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

export interface ExtendedGateReport extends GateReport {
  engineAction: "NONE" | "OPEN" | "CLOSE";
  currentPositionState: string;
}

export function runPipeline(
  inputs: PipelineInputs,
): ExtendedGateReport {
  const outcomes: GateOutcome[] = [];
  const priorPasses: GateId[] = [];
  let failedAt: GateId | null = null;

  const liveEngineContext = localPipelineStateMachine.getState();
  inputs.risk.positionState = liveEngineContext.state;
  inputs.risk.positionSide = liveEngineContext.side;
  inputs.risk.entryPrice = liveEngineContext.entryPrice;
  inputs.risk.signalPrice = liveEngineContext.signalPrice;
  inputs.risk.currentPrice = inputs.twin.last?.price || inputs.twin.last?.close || 0;

  for (const gate of PIPELINE) {
    const gateInputs: GateInputs = {
      twin: inputs.twin,
      ppg: inputs.ppg,
      risk: inputs.risk,
      priorPasses: priorPasses.slice(),
    };

    const outcome = gate(gateInputs);
    outcomes.push(outcome);

    if (!outcome.passed && outcome.hardVeto && failedAt === null) {
      failedAt = outcome.gate;
    }

    if (outcome.passed) {
      priorPasses.push(outcome.gate);
    }
  }

  let weightSum = 0;
  let weighted = 0;

  for (const outcome of outcomes) {
    weightSum += outcome.weight;
    weighted += outcome.weight * outcome.score;
  }

  const compositeScore = weightSum > 0 ? weighted / weightSum : 0;

  const allGatesPassed =
    outcomes.length === PIPELINE.length &&
    outcomes.every((outcome) => outcome.passed);

  const authorityOutcome = outcomes.find(
    (outcome) => outcome.gate === "G8_AUTHORITY",
  );

  const authorityPassed = authorityOutcome?.passed === true;

  const tradeArmed =
    authorityPassed &&
    failedAt === null &&
    compositeScore >= COMPOSITE_THRESHOLD;

  let engineAction: "NONE" | "OPEN" | "CLOSE" = "NONE";

  if (tradeArmed && inputs.twin?.last) {
    const currentPrice = inputs.twin.last.price || inputs.twin.last.close || 0;
    const timestamp = Date.now();
    const verdict = inputs.ppg?.verdict || "LOCKED-BULL";
    const agreement = inputs.ppg?.agreement || 0.85;

    const stateResult = localPipelineStateMachine.evaluateTick(
      currentPrice,
      timestamp,
      verdict,
      agreement,
      60,
      20
    );

    engineAction = stateResult.action;
  }

  return {
    outcomes,
    failedAt,
    allPassed: allGatesPassed,
    compositeScore,
    tradeArmed,
    compositeThreshold: COMPOSITE_THRESHOLD,
    twinSeq: inputs.twin.last?.twinSeq ?? -1,
    engineAction,
    currentPositionState: localPipelineStateMachine.getState().state,
  };
}
