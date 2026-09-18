/**
 * G5 — EXAMINATION (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates tick rate / velocity (tachometer) with clean, unchoked flow.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g5Examination: Gate = ({ ppg }): GateOutcome => {
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  const velocityValue = ppg?.velocity?.value ?? 0;

  // 1. Base Score (Clean Tachometer scaling)
  const baseScore = clamp01(velocityValue / 0.005);

  // 2. Minimal / Zero Structural Friction (Let the engine run free)
  let frictionPenalty = 0;

  // 3. Final Score Calculation
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 4. Low, Balanced Threshold to ensure smooth flow
  const isHealthy = finalScore >= 0.15;

  return {
    gate: "G5_EXAMINATION",
    passed: isHealthy,     
    score: finalScore,     
    weight: 0.75,          
    hardVeto: false,       
    evidence: {
      waveState,
      tickRate: velocityValue,
      frictionPenalty
    },
    reason: isHealthy
      ? `tachometer active · flow nominal · score=${finalScore.toFixed(3)} · velocity=${velocityValue.toFixed(4)}`
      : `SOFT VETO: low velocity · score=${finalScore.toFixed(3)} · velocity=${velocityValue.toFixed(4)}`,
    specified: true,
  };
};
