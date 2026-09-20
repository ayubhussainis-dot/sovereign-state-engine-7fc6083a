 /**
 * G4 — PATTERN
 *
 * Purpose:
 *   Evaluate whether current volatility and spread create
 *   excessive pattern friction for execution.
 *
 * Decision criterion:
 *   PatternFriction <= FRICTION_THRESHOLD
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * G4 answers:
 *   "Is the current price environment structurally clean enough
 *    for execution?"
 *
 * It does NOT determine BUY or SELL direction.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

/*
 * Explicit friction threshold.
 *
 * The existing friction model produces:
 *
 *   volatility contribution = volatility × 10
 *   spread contribution     = spread / 1000
 *
 * The threshold must be explicit so the gate has deterministic
 * behavior instead of merely displaying a score.
 */
const FRICTION_THRESHOLD = 1.0;

export const g4Pattern: Gate = ({ ppg }): GateOutcome => {
  const volatility = ppg?.volatility?.value ?? 0;
  const spread = ppg?.spread?.value ?? 0;

  /*
   * Pattern friction:
   *
   * Higher volatility  -> more friction
   * Higher spread      -> more friction
   */
  const volatilityFriction = Math.max(0, volatility) * 10;

  const spreadFriction = Math.max(0, spread) / 1000;

  const patternFriction =
    volatilityFriction + spreadFriction;

  /*
   * Convert friction into a 0–1 quality score.
   *
   * 0 friction      -> 1.00
   * threshold       -> 0.00
   *
   * Anything beyond the threshold remains at 0.
   */
  const score = clamp01(
    1 - patternFriction / FRICTION_THRESHOLD
  );

  /*
   * Actual gate decision.
   *
   * Missing/invalid market measurements are not considered safe.
   */
  const hasValidMeasurements =
    Number.isFinite(volatility) &&
    Number.isFinite(spread);

  const frictionAcceptable =
    patternFriction <= FRICTION_THRESHOLD;

  const passed =
    hasValidMeasurements &&
    frictionAcceptable;

  /*
   * Pattern failure becomes an execution veto.
   */
  const hardVeto = !passed;

  return {
    gate: "G4_PATTERN",

    passed,

    score,

    weight: 1.0,

    hardVeto,

    evidence: {
      volatility,
      spread,

      volatilityFriction,
      spreadFriction,

      patternFriction,

      frictionThreshold:
        FRICTION_THRESHOLD,

      frictionAcceptable,
      hasValidMeasurements,
    },

    reason: passed
      ? `pattern acceptable · friction=${patternFriction.toFixed(
          4
        )} · threshold=${FRICTION_THRESHOLD.toFixed(
          2
        )} · score=${score.toFixed(3)}`
      : `pattern friction too high · friction=${patternFriction.toFixed(
          4
        )} · threshold=${FRICTION_THRESHOLD.toFixed(
          2
        )} · EXECUTION VETO`,

    specified: true,
  };
};
