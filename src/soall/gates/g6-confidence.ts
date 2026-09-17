/**
 * G6 — CONFIDENCE (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Measure stability and rider conviction without blocking the run during jitter.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g6Confidence: Gate = ({ ppg }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const ofiValue = ppg?.ofi?.value ?? 0;

  const K1 = 2.0;
  const K2 = 1.0;
  const confidenceScore = Math.max(
    0,
    1.0 - (K1 * volatilityValue + K2 * Math.abs(ofiValue) * 0.1),
  );

  return {
    gate: "G6_CONFIDENCE",
    passed: true, // Unblocked spectator mode: confidence grades rider conviction, never blocks the run
    score: confidenceScore,
    weight: 1,
    hardVeto: false, // Zero friction, zero resistance
    evidence: {
      confidenceScore,
      volatility: volatilityValue,
      ofi: ofiValue,
    },
    reason: `driver conviction flowing smoothly · score=${confidenceScore.toFixed(3)} · volatility=${volatilityValue.toFixed(4)}`,
    specified: true,
  };
};
