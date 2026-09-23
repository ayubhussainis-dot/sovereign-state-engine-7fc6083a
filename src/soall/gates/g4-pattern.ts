/**
 * G4 — PATTERN (FRICTION & ALPHA REGIME GATE)
 *
 * Purpose:
 *   Evaluate whether current volatility and spread create excessive pattern friction,
 *   or serve as high-energy catalysts for asymmetric trapping execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * Behavior:
 *   - Friction within boundaries OR optimized by active Trapping volatility -> PASS
 *   - Excessive friction under standard baseline parameters -> FAIL
 *   - G4 remains a quality gate, not a hard execution veto.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

const FRICTION_THRESHOLD = 1.0;

export const g4Pattern: Gate = ({ ppg, risk }): GateOutcome => {
  const volatility =
    ppg?.volatility?.value ?? 0;

  const spread =
    ppg?.spread?.value ?? 0;

  const volatilityFriction =
    Math.max(0, volatility) * 10;

  const spreadFriction =
    Math.max(0, spread) / 1000;

  let patternFriction =
    volatilityFriction +
    spreadFriction;

  // --- SOVEREIGN ENERGY MODIFIER ---
  // If the engine is in a TRAPPING state, a high volatility signature is highly desirable.
  // It represents the retail stop-liquidation flush we are waiting for.
  let trappingVolatilityCatalyst = false;
  
  if (risk && risk.positionState === "TRAPPING") {
    // If friction is high purely due to volatility during a trap, we discount the penalty
    if (volatilityFriction > 0.5) {
      trappingVolatilityCatalyst = true;
      // Reduce the calculated friction penalty; we welcome high wave expansion here
      patternFriction = Math.max(0, spreadFriction); 
    }
  }

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

  // Gate passes if base friction is acceptable OR if it's classified as an active trapping catalyst
  const passed =
    hasValidMeasurements &&
    (frictionAcceptable || trappingVolatilityCatalyst);

  /*
   * G4 is a quality gate.
   * Failure does not independently block execution.
   */
  const hardVeto = false;

  const outputFriction = trappingVolatilityCatalyst ? 0.0000 : patternFriction;

  return {
    gate: "G4_PATTERN",

    passed,

    score: trappingVolatilityCatalyst ? 1.0 : score, // Max quality score if it's a confirmed trapping flush

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
      
      // Extended sovereign analytics for the audit ledger
      trappingVolatilityCatalyst,
      positionState: risk?.positionState ?? "FLAT"
    },

    reason: passed
      ? trappingVolatilityCatalyst 
        ? `pattern optimized · TRAP_VOLATILITY_CATALYST detected · rawFriction=${patternFriction.toFixed(4)} · score maxed`
        : `pattern acceptable · friction=${outputFriction.toFixed(4)} · threshold=${FRICTION_THRESHOLD.toFixed(2)} · score=${score.toFixed(3)}`
      : `pattern friction too high · friction=${patternFriction.toFixed(4)} · threshold=${FRICTION_THRESHOLD.toFixed(2)} · QUALITY FAIL`,

    specified: true,
  };
};
