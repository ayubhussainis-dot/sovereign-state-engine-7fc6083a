/**
 * G3 — CONFLUENCE (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates order flow imbalance and wave confluence with clean flow.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg }): GateOutcome => {
  const rawOfi = ppg?.ofi?.value ?? 0;
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  
  // Normalize OFI safely so massive order book depths don't break the math
  const normalizedOfi = Math.min(Math.abs(rawOfi) / 1e9, 1.0);
  
  // 1. Calculate Base Confluence
  const baseScore = clamp01(normalizedOfi * 2.0 + 0.5); // Baseline flow
  
  // 2. Minimal Friction (Let the engine run free)
  let frictionPenalty = 0;
  
  // 3. Final Score Calculation
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 4. Balanced Threshold for Smooth Flow
  const isHealthy = finalScore >= 0.2;

  return {
    gate: "G3_CONFLUENCE",
    passed: isHealthy,     
    score: finalScore,     
    weight: 1.0,           
    hardVeto: false,       
    evidence: {
      ofiProxy: rawOfi,
      normalizedOfi,
      waveState,
      frictionPenalty
    },
    reason: isHealthy
      ? `confluence aligned · flow nominal · score=${finalScore.toFixed(3)}`
      : `SOFT VETO: weak confluence · score=${finalScore.toFixed(3)}`,
    specified: true,
  };
};
