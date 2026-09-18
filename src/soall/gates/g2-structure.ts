/**
 * G2 — STRUCTURE (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates market volume and wave structure. Applies mathematical 
 * friction (soft veto) in compressed regimes rather than an absolute block.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g2Structure: Gate = ({ twin }): GateOutcome => {
  const rollingVolume = (twin?.buyVolume ?? 0) + (twin?.sellVolume ?? 0);
  const waveState = twin?.wave ?? "UNKNOWN"; 
  
  // 1. Calculate structural penalties (Friction)
  let frictionPenalty = 0;
  
  // If the market is choppy, apply heavy drag
  if (waveState === "COMPRESSED") frictionPenalty += 0.4;
  
  // If the market is dead (low volume), apply additional drag
  if (rollingVolume < 2.0) frictionPenalty += 0.3;

  // 2. Base score minus the friction
  const baseScore = clamp01(rollingVolume / (rollingVolume + 5));
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 3. The Soft Veto Threshold
  const isHealthy = finalScore >= 0.3;

  return {
    gate: "G2_STRUCTURE",
    passed: isHealthy,     // Fails this specific gate if friction is too high      
    score: finalScore,     // Passes a heavily penalized score down the pipeline
    weight: 1.0,           // High weight ensures this penalty drags down the final composite
    hardVeto: false,       // SOFT VETO: Never halts the pipeline instantly (prevents freezing)
    evidence: { 
      rollingVolume, 
      waveState,
      frictionPenalty,
      windowSize: twin?.window?.length ?? 0 
    },
    reason: isHealthy 
      ? `structure stable · score=${finalScore.toFixed(2)}`
      : `SOFT VETO: high structural friction · score=${finalScore.toFixed(2)}`,
    specified: true,
  };
};
