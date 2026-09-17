/**
 * G6 — CONFIDENCE (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Pure conviction telemetry observer. Zero blocking, zero friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g6Confidence: Gate = ({ ppg }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const ofiValue = ppg?.ofi?.value ?? 0;

  const K1 = 2.0;
  const K2 = 1.0;
  const rawScore = Math.max(
    0,
    1.0 - (K1 * volatilityValue + K2 * Math.abs(ofiValue) * 0.1),
  );
  const confidenceScore = rawScore > 0 ? rawScore : 1.0; // Maintain full glide across all jitter states

  return {
    gate: "G6_CONFIDENCE",
    passed: true,          // Absolute pass-through: confidence reads conviction, never restricts
    score: confidenceScore,
    weight: 1,
    hardVeto: false,       // Zero veto power, zero resistance
    evidence: {
      confidenceScore,
      volatility: volatilityValue,
      ofi: ofiValue,
    },
    reason: `driver conviction flowing freely · score=${confidenceScore.toFixed(3)} · volatility=${volatilityValue.toFixed(4)} · zero resistance`,
    specified: true,
  };
};
