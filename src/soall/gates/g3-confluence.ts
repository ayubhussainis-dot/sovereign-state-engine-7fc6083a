/**
 * G3 — CONFLUENCE
 * Decision Criterion: pass if ConfluenceScore ≥ Threshold_confluence.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * Updated: Replaced harsh COMPRESSED wave lockout with a smooth penalty multiplier for organic flow.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg }): GateOutcome => {
  const ofiValue = ppg?.ofi?.value ?? 0;
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  
  const confluenceScore = Math.abs(ofiValue);
  const raw = clamp01(confluenceScore / 0.2);

  // Apply smooth penalties based on wave state rather than a rigid binary block
  let stateMultiplier = 1.0;
  if (waveState === "NODAL_ZERO") {
    stateMultiplier = 0.5;
  } else if (waveState === "COMPRESSED") {
    stateMultiplier = 0.7; // Gentle penalty for chop instead of absolute rejection
  }

  const score = raw * stateMultiplier;
  
  // Fluid threshold gate (non-vetoable)
  const passed = score >= 0.25;

  return {
    gate: "G3_CONFLUENCE",
    passed,
    score,
    weight: 1,
    hardVeto: false, // Explicitly non-vetoable to let composite scoring weigh confluence organically
    evidence: {
      ofiProxy: ofiValue,
      confluenceScore,
      waveState,
      stateMultiplier,
    },
    reason: passed
      ? `confluence passed ${score.toFixed(3)} · OFI=${ofiValue.toFixed(4)} · ${waveState}`
      : `confluence below threshold: score ${score.toFixed(3)} (state: ${waveState})`,
    specified: true,
  };
};
