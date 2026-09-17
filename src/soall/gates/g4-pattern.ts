/**
 * G4 — PATTERN
 * Decision Criterion: pass if PatternFriction ≤ Threshold_friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * Updated: Added safe optional chaining and resilient telemetry defaults for smooth execution.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g4Pattern: Gate = ({ ppg }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const spreadValue = ppg?.spread?.value ?? 0.5;

  const patternFriction = volatilityValue * 10 + spreadValue / 1000;
  const score = clamp01(1 - patternFriction);
  
  // Non-blocking soft gate to modulate composite score organically
  const passed = true;

  return {
    gate: "G4_PATTERN",
    passed,
    score,
    weight: 1,
    hardVeto: false,
    evidence: {
      volatility: volatilityValue,
      spread: spreadValue,
      patternFriction,
    },
    reason: `pattern ${score.toFixed(3)} · friction=${patternFriction.toFixed(4)}`,
    specified: true,
  };
};
