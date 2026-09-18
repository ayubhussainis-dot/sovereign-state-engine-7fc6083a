/**
 * G6 — CONFIDENCE (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates driver conviction and market stability. Applies 
 * mathematical friction when conviction is weak or jitter is dangerously high.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g6Confidence: Gate = ({ ppg }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const ofiValue = ppg?.ofi?.value ?? 0;

  const K1 = 2.0;
  const K2 = 1.0;
  
  // 1. Base Raw Score (High volatility/jitter reduces raw confidence)
  const rawScore = 1.0 - (K1 * volatilityValue + K2 * Math.abs(ofiValue) * 0.1);
  const baseScore = clamp01(rawScore);

  // 2. Apply Structural Friction Penalties
  let frictionPenalty = 0;
  
  // If volatility is spiking (driver losing control / severe jitter), apply drag
  if (volatilityValue > 0.05) {
    frictionPenalty += 0.3;
  }

  // 3. Final Score Calculation (NEVER artificially reward 0)
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 4. Soft Veto Threshold
  // Requires at least a 0.3 score to clear without failing the gate
  const isHealthy = finalScore >= 0.3;

  return {
    gate: "G6_CONFIDENCE",
    passed: isHealthy,     // Fails the gate if the market is erratic
    score: finalScore,     // Passes the true, penalized score down the pipeline
    weight: 1.0,           // Equal weight to pull down the composite average
    hardVeto: false,       // SOFT VETO: Never halts the pipeline instantly
    evidence: {
      confidenceScore: finalScore,
      volatility: volatilityValue,
      ofi: ofiValue,
      frictionPenalty
    },
    reason: isHealthy
      ? `driver conviction stable · score=${finalScore.toFixed(3)} · vol=${volatilityValue.toFixed(4)}`
      : `SOFT VETO: erratic jitter/low conviction · score=${finalScore.toFixed(3)} · vol=${volatilityValue.toFixed(4)}`,
    specified: true,
  };
};
