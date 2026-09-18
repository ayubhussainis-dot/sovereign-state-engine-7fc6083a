/**
 * G6 — CONFIDENCE (TREND CONVICTION SCORER)
 * Purpose: Evaluates directional conviction without veto capability.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g6Confidence: Gate = ({ confidence }): GateOutcome => {
  const score = confidence?.score ?? 0.7;

  return {
    gate: "G6_CONFIDENCE",
    passed: true,          // Non-blocking score pass
    score,
    weight: 1.0,
    hardVeto: false,
    evidence: { rawScore: score },
    reason: `conviction scored · score=${score.toFixed(3)}`,
    specified: true,
  };
};
