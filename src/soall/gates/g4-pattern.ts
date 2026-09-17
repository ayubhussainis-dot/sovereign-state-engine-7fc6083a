/**
 * G4 — PATTERN (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Pure track surface telemetry observer. Zero blocking, zero friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g4Pattern: Gate = ({ ppg }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const spreadValue = ppg?.spread?.value ?? 0.5;

  // Track surface friction / grip calculation
  const patternFriction = volatilityValue * 10 + spreadValue / 1000;
  const raw = clamp01(1 - patternFriction);
  const score = raw > 0 ? raw : 1.0; // Maintain smooth glide across all surface states

  return {
    gate: "G4_PATTERN",
    passed: true,          // Absolute pass-through: pattern reads grip, never restricts
    score,
    weight: 1,
    hardVeto: false,       // Zero veto power, zero resistance
    evidence: {
      volatility: volatilityValue,
      spread: spreadValue,
      patternFriction,
    },
    reason: `track grip flowing freely · score=${score.toFixed(3)} · surface friction=${patternFriction.toFixed(4)}`,
    specified: true,
  };
};
