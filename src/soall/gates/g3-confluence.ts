/**
 * G3 — CONFLUENCE (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Evaluate order flow imbalance and wave state without blocking the track.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg }): GateOutcome => {
  const ofiValue = ppg?.ofi?.value ?? 0;
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  
  const confluenceScore = Math.abs(ofiValue);
  const raw = clamp01(confluenceScore / 0.2);

  // Smooth state multipliers for transmission gear / slope profiling
  let stateMultiplier = 1.0;
  if (waveState === "NODAL_ZERO") {
    stateMultiplier = 0.5;
  } else if (waveState === "COMPRESSED") {
    stateMultiplier = 0.7; // Gentle slope friction adjustment instead of rejection
  }

  const score = raw * stateMultiplier;

  return {
    gate: "G3_CONFLUENCE",
    passed: true, // Unblocked spectator mode: confluence grades the wave form, never blocks the run
    score,
    weight: 1,
    hardVeto: false, // Zero friction, zero resistance
    evidence: {
      ofiProxy: ofiValue,
      confluenceScore,
      waveState,
      stateMultiplier,
    },
    reason: `confluence flowing smoothly · score=${score.toFixed(3)} · OFI=${ofiValue.toFixed(4)} · wave=${waveState}`,
    specified: true,
  };
};
