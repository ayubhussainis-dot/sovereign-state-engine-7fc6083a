/**
 * G4 — PATTERN
 *
 * Purpose:
 *   Evaluate whether current volatility and spread create
 *   excessive pattern friction for execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * G4 is a quality gate.
 * Pattern friction does not independently veto execution.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

const FRICTION_THRESHOLD = 1.0;

export const g4Pattern: Gate = ({ ppg }): GateOutcome => {
  const volatility =
    ppg?.volatility?.value ?? 0;

  const spread =
    ppg?.spread?.value ?? 0;

  const volatilityFriction =
    Math.max(0, volatility) * 10;

  const spreadFriction =
    Math.max(0, spread) / 1000;

  const patternFriction =
    volatilityFriction +
    spreadFriction;

  const score = clamp01(
    1 -
      patternFriction /
        FRICTION_THRESHOLD
  );

  const hasValidMeasurements =
    Number.isFinite(volatility) &&
    Number.isFinite(spread);

  const frictionAcceptable =
    patternFriction <=
    FRICTION_THRESHOLD;

  const passed =
    hasValidMeasurements &&
    frictionAcceptable;

  /*
   * G4 is a quality gate.
   * Failure does not independently block execution.
   */
  const hardVeto = false;

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
        )} · score=${score.toFixed(
          3
        )}`
      : `pattern friction too high · friction=${patternFriction.toFixed(
          4
        )} · threshold=${FRICTION_THRESHOLD.toFixed(
          2
        )} · QUALITY FAIL`,

    specified: true,
  };
};
