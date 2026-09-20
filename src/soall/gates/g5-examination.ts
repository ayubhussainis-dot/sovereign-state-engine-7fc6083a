/**
 * G5 — EXAMINATION
 *
 * Purpose:
 *   Determine whether the market has sufficient movement/velocity
 *   to justify active execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * G5 is a quality gate.
 * Examination failure does not independently veto execution.
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
  const waveState =
    ppg?.wave?.state ?? "UNKNOWN";

  const velocity =
    ppg?.velocity?.value ?? 0;

  const hasMomentum =
    waveState !== "NODAL_ZERO" &&
    waveState !== "UNKNOWN";

  const raw =
    clamp01(velocity / 0.01);

  const score =
    hasMomentum
      ? raw
      : raw * 0.5;

  const velocitySufficient =
    Number.isFinite(velocity) &&
    velocity >= MIN_VELOCITY;

  const scoreSufficient =
    score >= MIN_EXAMINATION_SCORE;

  const passed =
    velocitySufficient &&
    scoreSufficient;

  /*
   * G5 is a quality gate.
   * Failure contributes to the gate result and score,
   * but does not independently block execution.
   */
  const hardVeto = false;

  return {
    gate: "G5_EXAMINATION",

    passed,

    score,

    weight: 0.75,

    hardVeto,

    evidence: {
      waveState,

      tickRate:
        velocity,

      minVelocity:
        MIN_VELOCITY,

      minimumScore:
        MIN_EXAMINATION_SCORE,

      rawVelocityScore:
        raw,

      examinationScore:
        score,

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
        )}/ms · wave=${waveState} · QUALITY FAIL`,

    specified: true,
  };
};
