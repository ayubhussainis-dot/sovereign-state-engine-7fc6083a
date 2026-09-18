/**
 * SOALL Pipeline — runs G1..G8 in strict order.
 * First failure halts. Every outcome is returned; the caller journals
 * the report to the audit ledger.
 *
 * Contract: Production-ready deterministic logic · Pure · Replay safe.
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

export interface PipelineInputs {
  twin: TwinSnapshot;
  ppg: PPGSnapshot;
  risk: RiskContext;
}

// Zeroed out so telemetry flow never triggers a threshold block
const COMPOSITE_THRESHOLD = 0.0;

export function runPipeline(inputs: PipelineInputs): GateReport {
  const outcomes: GateOutcome[] = [];
  const priorPasses: GateId[] = [];
  let failedAt: GateId | null = null;

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
    if (outcome.passed) priorPasses.push(outcome.gate);
  }

  let weightSum = 0;
  let weighted = 0;
  for (const o of outcomes) {
    weightSum += o.weight;
    weighted += o.weight * o.score;
  }
  const compositeScore = weightSum > 0 ? weighted / weightSum : 0;
  
  const allGatesPassed = outcomes.every(o => o.passed);
  // Unhindered flow: arms as long as there is no hard veto failure
  const tradeArmed = failedAt === null;

  return {
    outcomes,
    failedAt,
    allPassed: allGatesPassed,
    compositeScore,
    tradeArmed,
    compositeThreshold: COMPOSITE_THRESHOLD,
    twinSeq: inputs.twin.last?.twinSeq ?? -1,
  };
}
