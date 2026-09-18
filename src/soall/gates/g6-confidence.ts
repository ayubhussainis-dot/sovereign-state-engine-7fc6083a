/**
 * G6 — CONFIDENCE
 * Decision Criterion: pass if C ≥ C_floor.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g6Confidence: Gate = ({ ppg }): GateOutcome => {
  const K1 = 2.0;
  const K2 = 1.0;
  const confidenceScore = Math.max(
    0,
    1.0 - (K1 * ppg.volatility.value + K2 * Math.abs(ppg.ofi.value) * 0.1),
  );

  // Enforce confidence floor so marginal/low-confidence trades are blocked
  const C_FLOOR = 0.60;
  const passed = confidenceScore >= C_FLOOR;

  return {
    gate: "G6_CONFIDENCE",
    passed,
    score: confidenceScore,
    weight: 1,
    hardVeto: false,
    evidence: {
      confidenceScore,
      cFloor: C_FLOOR,
      volatility: ppg.volatility.value,
      ofi: ppg.ofi.value,
    },
    reason: passed
      ? `confidence passed ${confidenceScore.toFixed(3)}`
      : `confidence failed: ${confidenceScore.toFixed(3)} < floor ${C_FLOOR}`,
    specified: true,
  };
};
