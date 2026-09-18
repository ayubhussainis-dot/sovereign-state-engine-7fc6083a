/**
 * G6 — CONFIDENCE (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates driver conviction and market stability with clean normalization.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g6Confidence: Gate = ({ ppg }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const rawOfi = ppg?.ofi?.value ?? 0;

  // Normalize OFI logarithmically or via scaling so massive order book sizes don't break the math
  const normalizedOfi = Math.min(Math.abs(rawOfi) / 1e9, 1.0);

  const K1 = 1.0;
  const K2 = 0.5;
  
  // 1. Clean Base Score calculation without destroying the pipeline
  const rawScore = 1.0 - (K1 * volatilityValue + K2 * normalizedOfi);
  const baseScore = clamp01(rawScore);

  // 2. Minimal Friction (Let the engine flow)
  let frictionPenalty = 0;
  
  if (volatilityValue > 0.08) {
    frictionPenalty += 0.15; // Much lighter penalty so it doesn't slam brakes
  }

  // 3. Final Score Calculation
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 4. Balanced Threshold
  const isHealthy = finalScore >= 0.2; // Lowered threshold to ensure smooth flow

  return {
    gate: "G6_CONFIDENCE",
    passed: isHealthy,     
    score: finalScore,     
    weight: 1.0,           
    hardVeto: false,       
    evidence: {
      confidenceScore: finalScore,
      volatility: volatilityValue,
      ofi: rawOfi,
      normalizedOfi,
      frictionPenalty
    },
    reason: isHealthy
      ? `driver conviction stable · score=${finalScore.toFixed(3)} · vol=${volatilityValue.toFixed(4)}`
      : `SOFT VETO: erratic jitter · score=${finalScore.toFixed(3)} · vol=${volatilityValue.toFixed(4)}`,
    specified: true,
  };
};
