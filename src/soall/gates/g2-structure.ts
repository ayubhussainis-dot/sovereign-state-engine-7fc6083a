/**
 * G2 — STRUCTURE
 * Decision Criterion: pass if M_state ≠ STRESSED and σ_v within bounds.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: M_state definition and σ_v bounds are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

export const g2Structure: Gate = ({ twin }): GateOutcome => ({
  gate: "G2_STRUCTURE",
  passed: twin.last !== null,
  evidence: {
    windowSize: twin.window.length,
    marketState: "UNSPECIFIED",
    volumeVariance: null,
  },
  reason: "structural gate — math unspecified",
  specified: false,
});