/**
 * G3 — CONFLUENCE
 * Decision Criterion: pass if ConfluenceScore ≥ Threshold_confluence.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: ConfluenceScore formula and threshold are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

export const g3Confluence: Gate = ({ ppg }): GateOutcome => ({
  gate: "G3_CONFLUENCE",
  passed: true,
  evidence: {
    ofiValue: ppg.ofi.value,
    ofiSpecified: ppg.ofi.specified,
    waveState: ppg.wave.state,
    confluenceScore: null,
  },
  reason: "structural gate — math unspecified",
  specified: false,
});