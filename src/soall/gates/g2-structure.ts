/**
 * G2 — STRUCTURE (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Pure structural telemetry observer. Zero blocking, zero friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g2Structure: Gate = ({ twin }): GateOutcome => {
  const rollingVolume = (twin?.buyVolume ?? 0) + (twin?.sellVolume ?? 0);
  
  // Structural richness score: smooth volume curve saturating past ~5 volume units
  const baseScore = clamp01(rollingVolume / (rollingVolume + 5));
  const score = baseScore > 0 ? baseScore : 1.0; // Maintain full glide even in quiet water

  return {
    gate: "G2_STRUCTURE",
    passed: true,          // Absolute pass-through: structure informs, never restricts
    score,
    weight: 0.5,
    hardVeto: false,       // Zero veto power, zero resistance
    evidence: { 
      rollingVolume, 
      windowSize: twin?.window?.length ?? 0 
    },
    reason: `transmission structure flowing freely · volume=${rollingVolume} · zero resistance`,
    specified: true,
  };
};
