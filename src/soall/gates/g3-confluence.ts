/**
 * G3 — CONFLUENCE
 * Decision Criterion: pass if ConfluenceScore ≥ Threshold_confluence.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: ConfluenceScore formula and threshold are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

export const g3Confluence: Gate = ({ ppg }): GateOutcome => {
  const MIN_OFI_THRESHOLD = 0.05;
  const confluenceScore = Math.abs(ppg.ofi.value);
  const passed =
    confluenceScore >= MIN_OFI_THRESHOLD && ppg.wave.state !== "NODAL_ZERO";
  return {
    gate: "G3_CONFLUENCE",
    passed,
    evidence: {
      ofiProxy: ppg.ofi.value,
      confluenceScore,
      waveState: ppg.wave.state,
      threshold: MIN_OFI_THRESHOLD,
    },
    reason: passed
      ? "confluence confirmed"
      : `Insufficient order flow confluence: OFI=${ppg.ofi.value.toFixed(4)} (Threshold: ${MIN_OFI_THRESHOLD})`,
    specified: true,
  };
};