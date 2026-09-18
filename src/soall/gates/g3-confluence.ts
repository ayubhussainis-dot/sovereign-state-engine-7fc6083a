/**
 * G3 — CONFLUENCE (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates order flow imbalance and wave confluence. Applies 
 * mathematical friction when directional agreement is weak or compressed.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg }): GateOutcome => {
  const ofiValue = ppg?.ofi?.value ?? 0;
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  
  const confluenceScore = Math.abs(ofiValue);
  
  // 1. Calculate Base Confluence (0 to 1 scale)
  const baseScore = clamp01(confluenceScore / 0.2);
  
  // 2. Apply Structural Friction (The Soft Veto Penalties)
  let frictionPenalty = 0;
  
  // Heavy drag if the wave is compressed (sideways chop)
  if (waveState === "COMPRESSED") {
    frictionPenalty += 0.3;
  }
  
  // Additional drag if order flow imbalance is virtually zero (no clear winner)
  if (confluenceScore < 0.05) {
    frictionPenalty += 0.2;
  }

  // 3. Final Score Calculation (Never artificially reward 0)
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 4. Soft Veto Threshold
  // Requires at least a 0.3 score to clear this specific gate without failure
  const isHealthy = finalScore >= 0.3;

  return {
    gate: "G3_CONFLUENCE",
    passed: isHealthy,     // Fails the gate if order flow is purely neutral/choppy
    score: finalScore,     // Passes the true, penalized score to the composite engine
    weight: 1.0,           // Equal weight to pull down the final average if weak
    hardVeto: false,       // SOFT VETO: Never halts the pipeline instantly
    evidence: {
      ofiProxy: ofiValue,
      confluenceScore,
      waveState,
      frictionPenalty
    },
    reason: isHealthy
      ? `confluence aligned · score=${finalScore.toFixed(3)} · OFI=${ofiValue.toFixed(4)}`
      : `SOFT VETO: weak confluence/chop · score=${finalScore.toFixed(3)} · OFI=${ofiValue.toFixed(4)}`,
    specified: true,
  };
};
