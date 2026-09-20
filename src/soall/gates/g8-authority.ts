/**
 * SOALL Pipeline — runs G1..G8 in strict order.
 *
 * G1..G7 evaluate the execution conditions.
 * G8 is the final authority gate.
 *
 * Every gate is evaluated so the complete report can be
 * recorded in the audit ledger.
 *
 * Contract:
 *   Deterministic · Pure · Replay safe.
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

/*
 * Composite score is currently diagnostic.
 *
 * We are not using the composite score as an additional
 * trading restriction until the system is calibrated.
 */
const COMPOSITE_THRESHOLD = 0.0;

export interface PipelineInputs {
  twin: TwinSnapshot;
  ppg: PPGSnapshot;
  risk: RiskContext;
}

export function runPipeline(
  inputs: PipelineInputs,
): GateReport {
  const outcomes: GateOutcome[] = [];

  /*
   * Stores the gates that have actually passed.
   *
   * G8 receives this cumulative pass vector.
   */
  const priorPasses: GateId[] = [];

  /*
   * First hard-veto failure.
   */
  let failedAt: GateId | null = null;

  /*
   * Run G1 through G8 in strict order.
   *
   * We intentionally continue through G8 so that the final
   * authority decision and complete gate report are available.
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
     * Record the first hard-veto failure.
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
   * Calculate the diagnostic weighted composite.
   */
  let weightSum = 0;
  let weighted = 0;

  for (const outcome of outcomes) {
    weightSum += outcome.weight;
    weighted +=
      outcome.weight * outcome.score;
  }

  const compositeScore =
    weightSum > 0
      ? weighted / weightSum
      : 0;

  /*
   * Every gate must pass.
   */
  const allGatesPassed =
    outcomes.length === PIPELINE.length &&
    outcomes.every(
      (outcome) => outcome.passed,
    );

  /*
   * G8 is the final authority.
   *
   * Do not infer authority from failedAt alone.
   * Read the actual G8 result.
   */
  const authorityOutcome =
    outcomes.find(
      (outcome) =>
        outcome.gate === "G8_AUTHORITY",
    );

  const authorityPassed =
    authorityOutcome?.passed === true;

  /*
   * Final trade readiness.
   *
   * A trade is armed only when:
   *
   *   1. All eight gates passed.
   *   2. G8 granted authority.
   *   3. No hard veto occurred.
   *   4. Composite meets its configured threshold.
   */
  const tradeArmed =
    allGatesPassed &&
    authorityPassed &&
    failedAt === null &&
    compositeScore >= COMPOSITE_THRESHOLD;

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
      inputs.twin.last?.twinSeq ?? -1,
  };
}
