/**
 * G4 — PATTERN
 * Decision Criterion: pass if PatternFriction ≤ Threshold_friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: PatternFriction composition and threshold are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

export const g4Pattern: Gate = ({ ppg }): GateOutcome => {
  const MAX_VOLATILITY = 0.03;
  const MAX_SPREAD = 50.0;
  const patternFriction = ppg.volatility.value * 10 + ppg.spread.value / 1000;
  const passed =
    ppg.volatility.value <= MAX_VOLATILITY && ppg.spread.value <= MAX_SPREAD;
  return {
    gate: "G4_PATTERN",
    passed,
    evidence: {
      volatility: ppg.volatility.value,
      spread: ppg.spread.value,
      patternFriction,
      maxVolatility: MAX_VOLATILITY,
      maxSpread: MAX_SPREAD,
    },
    reason: passed
      ? "pattern friction within bounds"
      : `Pattern friction limit breached: Volatility=${ppg.volatility.value.toFixed(4)}, Spread=$${ppg.spread.value}`,
    specified: true,
  };
};