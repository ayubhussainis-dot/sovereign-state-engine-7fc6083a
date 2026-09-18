/**
 * G4 — PATTERN (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates track surface (volatility and spread). Applies mathematical
 * friction (soft veto) when market noise or spread is too high.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g4Pattern: Gate = ({ ppg }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const spreadValue = ppg?.spread?.value ?? 0.5;

  // 1. Calculate Track Surface Friction / Grip
  // High volatility or wide spread increases friction
  const patternFriction = volatilityValue * 10 + (spreadValue / 1000);
  
  // 2. Base Score Calculation (True inverse of friction)
  // The higher the friction, the lower the score. 
  const baseScore = clamp01(1 - patternFriction);

  // 3. Apply Structural Friction Penalties
  let frictionPenalty = 0;
  
  // If spread is abnormally wide (illiquid/choppy), add drag
  if (spreadValue > 1.5) { 
    frictionPenalty += 0.2;
  }
  
  // If volatility is dangerously high (whipsaw territory), add drag
  if (volatilityValue > 0.06) { 
    frictionPenalty += 0.3;
  }

  // 4. Final Score (NEVER artificially reward 0)
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 5. Soft Veto Threshold
  const isHealthy = finalScore >= 0.3;

  return {
    gate: "G4_PATTERN",
    passed: isHealthy,     // Fails the gate if surface friction is too high
    score: finalScore,     // Passes the true, penalized score down the pipeline
    weight: 1.0,           // Equal weight to pull down the composite if weak
    hardVeto: false,       // SOFT VETO: Never halts the pipeline instantly
    evidence: {
      volatility: volatilityValue,
      spread: spreadValue,
      patternFriction,
      frictionPenalty
    },
    reason: isHealthy
      ? `track grip stable · score=${finalScore.toFixed(3)} · friction=${patternFriction.toFixed(4)}`
      : `SOFT VETO: high surface friction/spread · score=${finalScore.toFixed(3)} · friction=${patternFriction.toFixed(4)}`,
    specified: true,
  };
};
