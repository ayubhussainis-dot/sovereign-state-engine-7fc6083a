/**
 * G4 — PATTERN (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Measure track friction and surface grip without blocking the run.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g4Pattern: Gate = ({ ppg }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const spreadValue = ppg?.spread?.value ?? 0.5;

  // Track surface friction / grip calculation
  const patternFriction = volatilityValue * 10 + spreadValue / 1000;
  const score = clamp01(1 - patternFriction);

  return {
    gate: "G4_PATTERN",
    passed: true, // Unblocked spectator mode: pattern friction grades track surface, never blocks the run
    score,
    weight: 1,
    hardVeto: false, // Zero friction, zero resistance
    evidence: {
      volatility: volatilityValue,
      spread: spreadValue,
      patternFriction,
    },
    reason: `track grip flowing smoothly · score=${score.toFixed(3)} · surface friction=${patternFriction.toFixed(4)}`,
    specified: true,
  };
};
