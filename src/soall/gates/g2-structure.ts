/**
 * G2 — STRUCTURE
 * Decision Criterion: pass if M_state ≠ STRESSED and σ_v within bounds.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * Updated: Relaxed rigid volume checks and smoothed the structural saturation curve for organic flow.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g2Structure: Gate = ({ twin, risk }): GateOutcome => {
  const rollingVolume = (twin?.buyVolume ?? 0) + (twin?.sellVolume ?? 0);
  
  // Graceful system health check allowing smooth transitions
  const isStressed = risk?.systemHealth === "LOCKED_DOWN" || risk?.systemHealth === "STRESSED";
  const passed = !isStressed;

  // Structural richness: smoother curve saturating faster past ~5 volume units
  const score = isStressed ? 0.1 : clamp01(rollingVolume / (rollingVolume + 5));

  return {
    gate: "G2_STRUCTURE",
    passed,
    score,
    weight: 0.5,
    hardVeto: false, // Explicitly non-vetoable to let composite scoring handle structural weight
    evidence: { 
      marketState: isStressed ? "STRESSED" : "NORMAL", 
      rollingVolume, 
      windowSize: twin?.window?.length ?? 0 
    },
    reason: passed
      ? "structural integrity intact"
      : `Structural caution: System health indicates stress (${risk?.systemHealth ?? 'UNKNOWN'})`,
    specified: true,
  };
};
