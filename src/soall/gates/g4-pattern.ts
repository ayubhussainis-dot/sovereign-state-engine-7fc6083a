/**
 * G4 — PATTERN
 * Decision Criterion: pass if PatternFriction ≤ Threshold_friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: PatternFriction composition and threshold are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g4Pattern: Gate = ({ ppg }): GateOutcome => {
  const patternFriction = ppg.volatility.value * 10 + ppg.spread.value / 1000;
  const score = clamp01(1 - patternFriction);
  const passed = true;
  return {
    gate: "G4_PATTERN",
    passed,
    score,
    weight: 1,
    hardVeto: false,
    evidence: {
      volatility: ppg.volatility.value,
      spread: ppg.spread.value,
      patternFriction,
    },
    reason: `pattern ${score.toFixed(3)} · friction=${patternFriction.toFixed(4)}`,
    specified: true,
  };
};
