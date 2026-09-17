/**
 * G2 — STRUCTURE (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Read market volume and structural integrity without blocking the track.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g2Structure: Gate = ({ twin, risk }): GateOutcome => {
  const rollingVolume = (twin?.buyVolume ?? 0) + (twin?.sellVolume ?? 0);
  
  // Check market state for transmission gear scoring (low-end torque vs cruising glide)
  const isStressed = risk?.systemHealth === "LOCKED_DOWN" || risk?.systemHealth === "STRESSED";

  // Structural richness score: smooth volume curve saturating past ~5 volume units
  const baseScore = clamp01(rollingVolume / (rollingVolume + 5));
  const score = isStressed ? baseScore * 0.3 : baseScore;

  return {
    gate: "G2_STRUCTURE",
    passed: true, // Unblocked spectator mode: structure informs the gear ratio, never blocks the track
    score,
    weight: 0.5,
    hardVeto: false, // Zero friction, zero resistance
    evidence: { 
      marketState: isStressed ? "STRESSED" : "NORMAL", 
      rollingVolume, 
      windowSize: twin?.window?.length ?? 0 
    },
    reason: `transmission structure flowing · volume=${rollingVolume} · gear state=${isStressed ? "choppy corner (downshift)" : "straightaway glide"}`,
    specified: true,
  };
};
