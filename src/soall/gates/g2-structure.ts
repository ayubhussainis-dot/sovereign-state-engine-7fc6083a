/**
 * G2 — STRUCTURE (MARKET REGIME SCORING)
 * Purpose: Evaluates volume and structural state without artificial compression penalties.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g2Structure: Gate = ({ twin }): GateOutcome => {
  const rollingVolume = (twin?.buyVolume ?? 0) + (twin?.sellVolume ?? 0);
  const waveState = twin?.wave ?? "UNKNOWN"; 

  // Pure flow scoring without blocking compression penalties
  const baseScore = clamp01(rollingVolume / (rollingVolume + 5) + 0.3);

  return {
    gate: "G2_STRUCTURE",
    passed: true,          // Non-blocking telemetry score
    score: baseScore,     
    weight: 1.0,           
    hardVeto: false,       
    evidence: { 
      rollingVolume, 
      waveState,
      windowSize: twin?.window?.length ?? 0 
    },
    reason: `structure evaluated · volume=${rollingVolume.toFixed(2)} · score=${baseScore.toFixed(2)}`,
    specified: true,
  };
};
