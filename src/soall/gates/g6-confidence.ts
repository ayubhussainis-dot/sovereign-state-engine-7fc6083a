/**
 * G6 — CONFIDENCE
 *
 * Decision Criterion:
 *   Pass if C >= C_FLOOR.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * G6 answers:
 *   "Is the calculated confidence high enough?"
 *
 * It does NOT determine BUY or SELL direction.
 *
 * Authority model:
 *   G6 is a QUALITY / CONFIDENCE gate.
 *   A failed G6 does NOT veto execution by itself.
 *
 * NOTE:
 *   The existing confidence formula is preserved exactly.
 *   Only execution authority is changed.
 */

import type { Gate, GateOutcome } from "../types";

const K1 = 2.0;
const K2 = 1.0;

const C_FLOOR = 0.60;

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

export const g6Confidence: Gate = ({
  ppg,
}): GateOutcome => {
  const volatility =
    ppg?.volatility?.value ?? 0;

  const ofi =
    ppg?.ofi?.value ?? 0;

  /*
   * Preserve the existing confidence mathematics:
   *
   * C = 1 - (K1 × volatility + K2 × |OFI| × 0.1)
   *
   * The result is bounded to [0, 1].
   */
  const rawConfidence =
    1.0 -
    (
      K1 * volatility +
      K2 * Math.abs(ofi) * 0.1
    );

  const confidenceScore =
    clamp01(rawConfidence);

  /*
   * Actual confidence decision.
   */
  const passed =
    Number.isFinite(confidenceScore) &&
    confidenceScore >= C_FLOOR;

  /*
   * G6 is NOT a hard execution veto.
   *
   * A failed confidence check is recorded as
   * a quality failure, while final execution
   * authority remains with the safety gates
   * and G8.
   */
  const hardVeto = false;

  return {
    gate: "G6_CONFIDENCE",

    passed,

    score: confidenceScore,

    weight: 1.0,

    hardVeto,

    evidence: {
      confidenceScore,

      cFloor: C_FLOOR,

      volatility,

      ofi,

      k1: K1,

      k2: K2,

      confidenceFormula:
        "1 - (K1 × volatility + K2 × |OFI| × 0.1)",

      confidenceSufficient:
        passed,

      executionVeto:
        false,
    },

    reason: passed
      ? `confidence passed · C=${confidenceScore.toFixed(
          3
        )} · floor=${C_FLOOR.toFixed(2)}`
      : `confidence failed · C=${confidenceScore.toFixed(
          3
        )} < floor=${C_FLOOR.toFixed(
          2
        )} · QUALITY FAIL`,

    specified: true,
  };
};
