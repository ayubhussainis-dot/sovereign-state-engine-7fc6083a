/**
 * G6 — CONFIDENCE
 * Decision Criterion: pass if C ≥ C_floor.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: C(V, ε_h) formula and C_floor are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

export const g6Confidence: Gate = ({ ppg }): GateOutcome => {
  const K1 = 2.0;
  const K2 = 1.0;
  const CONFIDENCE_FLOOR = 0.6;
  const confidenceScore = Math.max(
    0,
    1.0 - (K1 * ppg.volatility.value + K2 * Math.abs(ppg.ofi.value) * 0.1),
  );
  const passed = confidenceScore >= CONFIDENCE_FLOOR;
  return {
    gate: "G6_CONFIDENCE",
    passed,
    evidence: {
      confidenceScore,
      floor: CONFIDENCE_FLOOR,
      volatility: ppg.volatility.value,
      ofi: ppg.ofi.value,
    },
    reason: passed
      ? `confidence ${confidenceScore.toFixed(3)} ≥ ${CONFIDENCE_FLOOR}`
      : `Confidence score ${confidenceScore.toFixed(3)} below structural floor (${CONFIDENCE_FLOOR})`,
    specified: true,
  };
};