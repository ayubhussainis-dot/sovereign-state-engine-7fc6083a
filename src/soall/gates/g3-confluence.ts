/**
 * G3 — CONFLUENCE
 * Decision Criterion: pass if ConfluenceScore ≥ Threshold_confluence.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg }): GateOutcome => {
  const confluenceScore = Math.abs(ppg.ofi.value);
  const raw = clamp01(confluenceScore / 0.2);
  const score = ppg.wave.state === "NODAL_ZERO" ? raw * 0.5 : raw;
  
  // Enforce minimum confluence floor and block heavy compressed wave chop
  const passed = score >= 0.30 && ppg.wave.state !== "COMPRESSED";

  return {
    gate: "G3_CONFLUENCE",
    passed,
    score,
    weight: 1,
    hardVeto: false,
    evidence: {
      ofiProxy: ppg.ofi.value,
      confluenceScore,
      waveState: ppg.wave.state,
    },
    reason: passed
      ? `confluence passed ${score.toFixed(3)} · OFI=${ppg.ofi.value.toFixed(4)} · ${ppg.wave.state}`
      : `confluence failed: score ${score.toFixed(3)} or compressed wave chop (${ppg.wave.state})`,
    specified: true,
  };
};
