/**
 * G6 — CONFIDENCE
 * Decision Criterion: pass if C ≥ C_floor.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * Updated: Added safe optional chaining, telemetry defaults, and relaxed confidence floor for organic flow.
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

  // Relaxed confidence floor for smoother market navigation during jitter
  const C_FLOOR = 0.45;
  const passed = confidenceScore >= C_FLOOR;

  return {
    gate: "G6_CONFIDENCE",
    passed,
    score: confidenceScore,
    weight: 1,
    hardVeto: false, // Explicitly non-vetoable to allow composite scoring flexibility
    evidence: {
      confidenceScore,
      cFloor: C_FLOOR,
      volatility: volatilityValue,
      ofi: ofiValue,
    },
    reason: passed
      ? `confidence passed ${confidenceScore.toFixed(3)}`
      : `confidence caution: score ${confidenceScore.toFixed(3)} below floor ${C_FLOOR}`,
    specified: true,
  };
};
