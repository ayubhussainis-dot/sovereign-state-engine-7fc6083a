/**
 * G4 — PATTERN (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates track surface with clean, unchoked flow.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g4Pattern: Gate = ({ ppg, twin }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const spreadValue = ppg?.spread?.value ?? 0.5;
  const waveState = ppg?.wave?.state ?? twin?.wave ?? "UNKNOWN";

  // 1. Clean Track Surface Friction Calculation
  const patternFriction = volatilityValue * 2.0 + (spreadValue / 5000);
  
  // 2. Base Score Calculation
  const baseScore = clamp01(1 - patternFriction);

  // 3. Minimal Friction (Let the market run free)
  let frictionPenalty = 0;
  
  if (spreadValue > 3.0) { 
    frictionPenalty += 0.1;
  }

  // 4. Final Score Calculation
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 5. Balanced Threshold for Smooth Flow
  const isHealthy = finalScore >= 0.2;

  return {
    gate: "G4_PATTERN",
    passed: isHealthy,     
    score: finalScore,     
    weight: 1.0,           
    hardVeto: false,       
    evidence: {
      volatility: volatilityValue,
      spread: spreadValue,
      waveState,
      patternFriction,
      frictionPenalty
    },
    reason: isHealthy
      ? `track grip stable · flow nominal · score=${finalScore.toFixed(3)}`
      : `SOFT VETO: high spread · score=${finalScore.toFixed(3)}`,
    specified: true,
  };
};
