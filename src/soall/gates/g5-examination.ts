/**
 * G5 — EXAMINATION
 *
 * Purpose:
 *   Determine whether the market has sufficient movement/velocity
 *   to justify active execution.
 *
 * Decision criterion:
 *   - Minimum velocity must be present.
 *   - Examination score must meet the minimum threshold.
 *   - NODAL_ZERO receives reduced examination strength.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * G5 answers:
 *   "Is the market actually moving enough to examine for execution?"
 *
 * It does NOT determine BUY or SELL direction.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

const MIN_VELOCITY = 0.001;
const MIN_EXAMINATION_SCORE = 0.20;

export const g5Examination = ({
  ppg,
}: {
  ppg: any;
}): GateOutcome => {
  const waveState = ppg?.wave?.state ?? "UNKNOWN";

  const velocity = ppg?.velocity?.value ?? 0;

  /*
   * NODAL_ZERO means the market is effectively stationary/
   * structurally inactive for examination purposes.
   */
  const hasMomentum =
    waveState !== "NODAL_ZERO" &&
    waveState !== "UNKNOWN";

  /*
   * Normalize velocity.
   *
   * 0.01/ms represents the full-strength reference point
   * used by the existing implementation.
   */
  const raw = clamp01(velocity / 0.01);

  /*
   * Preserve the original NODAL_ZERO penalty.
   */
  const score = hasMomentum
    ? raw
    : raw * 0.5;

  /*
   * Actual examination decision.
   */
  const velocitySufficient =
    Number.isFinite(velocity) &&
    velocity >= MIN_VELOCITY;

  const scoreSufficient =
    score >= MIN_EXAMINATION_SCORE;

  const passed =
    velocitySufficient &&
    scoreSufficient;

  /*
   * G5 now has actual execution authority.
   *
   * If the market is too slow or examination quality is too weak,
   * execution is vetoed.
   */
  const hardVeto = !passed;

  return {
    gate: "G5_EXAMINATION",

    passed,

    score,

    weight: 0.75,

    hardVeto,

    evidence: {
      waveState,

      tickRate: velocity,

      minVelocity: MIN_VELOCITY,

      minimumScore:
        MIN_EXAMINATION_SCORE,

      rawVelocityScore: raw,

      examinationScore: score,

      hasMomentum,

      velocitySufficient,

      scoreSufficient,
    },

    reason: passed
      ? `examination passed · score=${score.toFixed(
          3
        )} · velocity=${velocity.toFixed(
          4
        )}/ms · wave=${waveState}`
      : `examination failed · score=${score.toFixed(
          3
        )} · velocity=${velocity.toFixed(
          4
        )}/ms · wave=${waveState} · EXECUTION VETO`,

    specified: true,
  };
};
