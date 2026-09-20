/**
 * SOALL Pipeline — runs G1..G8 in strict order.
 *
 * G1..G7 evaluate the execution conditions.
 * G8 is the final authority gate.
 *
 * Every gate is evaluated so the complete report can be
 * recorded in the audit ledger.
 *
 * Authority model:
 *
 *   G1 = safety veto
 *   G2 = quality
 *   G3 = quality
 *   G4 = quality
 *   G5 = quality
 *   G6 = quality
 *   G7 = safety veto
 *   G8 = final authority
 *
 * G2..G6 may fail without independently blocking execution.
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
 * Composite score is diagnostic.
 *
 * G2..G6 contribute to this score, but the composite
 * is not currently an additional trading restriction.
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
   * Stores gates that actually passed.
   *
   * G8 uses this vector to verify the mandatory
   * safety gates G1 and G7.
   */
  const priorPasses: GateId[] = [];

  /*
   * First genuine hard-veto failure.
   *
   * G2..G6 cannot populate this because they are
   * quality gates with hardVeto=false.
   */
  let failedAt: GateId | null = null;

  /*
   * Run G1 through G8 in strict order.
   *
   * Every gate runs so the complete audit report
   * remains available even when a safety gate fails.
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
     * Record the first actual hard-veto failure.
     */
    if (
      !outcome.passed &&
      outcome.hardVeto &&
      failedAt === null
    ) {
      failedAt = outcome.gate;
    }

    /*
     * Only passed gates enter the cumulative
     * pass vector used by downstream authority.
     */
    if (outcome.passed) {
      priorPasses.push(outcome.gate);
    }
  }

  /*
   * Calculate the diagnostic weighted composite.
   *
   * This remains informational until calibrated.
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
   * Informational status only.
   *
   * This is deliberately NOT used as the execution
   * requirement because G2..G6 are quality gates.
   */
  const allGatesPassed =
    outcomes.length === PIPELINE.length &&
    outcomes.every(
      (outcome) => outcome.passed,
    );

  /*
   * G8 is the final execution authority.
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
   * Execution requires:
   *
   *   1. G8 grants authority.
   *   2. No genuine hard safety veto exists.
   *   3. Composite meets its diagnostic threshold.
   *
   * G2..G6 are intentionally NOT required to pass.
   *
   * Therefore:
   *
   *   G2 fail  -> trade can still arm
   *   G3 fail  -> trade can still arm
   *   G4 fail  -> trade can still arm
   *   G5 fail  -> trade can still arm
   *   G6 fail  -> trade can still arm
   *
   * But:
   *
   *   G1 fail  -> execution blocked
   *   G7 fail  -> execution blocked
   *   G8 fail  -> execution blocked
   */
  const tradeArmed =
    authorityPassed &&
    failedAt === null &&
    compositeScore >= COMPOSITE_THRESHOLD;

  return {
    outcomes,

    failedAt,

    /*
     * Preserve this as a complete-report diagnostic.
     * It is intentionally NOT used to arm trading.
     */
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
