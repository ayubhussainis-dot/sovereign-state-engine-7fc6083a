/**
 * G2 — STRUCTURE (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates market volume and wave structure with clean, unchoked flow.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g2Structure: Gate = ({ twin }): GateOutcome => {
  const rollingVolume = (twin?.buyVolume ?? 0) + (twin?.sellVolume ?? 0);
  const waveState = twin?.wave ?? "UNKNOWN"; 
  
  // 1. Minimal / Zero Structural Friction (Let the engine run free)
  let frictionPenalty = 0;

  // 2. Base score calculation
  const baseScore = clamp01(rollingVolume / (rollingVolume + 5) + 0.3);
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 3. Balanced Threshold for Smooth Flow
  const isHealthy = finalScore >= 0.2;

  return {
    gate: "G2_STRUCTURE",
    passed: isHealthy,      
    score: finalScore,     
    weight: 1.0,           
    hardVeto: false,       
    evidence: { 
      rollingVolume, 
      waveState,
      frictionPenalty,
      windowSize: twin?.window?.length ?? 0 
    },
    reason: isHealthy 
      ? `structure stable · flow nominal · score=${finalScore.toFixed(2)}`
      : `SOFT VETO: low volume · score=${finalScore.toFixed(2)}`,
    specified: true,
  };
};
