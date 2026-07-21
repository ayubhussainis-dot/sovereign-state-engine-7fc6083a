/**
 * G6 — CONFIDENCE
 * Decision Criterion: pass if C ≥ C_floor.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: C(V, ε_h) formula and C_floor are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

export const g6Confidence: Gate = ({ ppg }): GateOutcome => ({
  gate: "G6_CONFIDENCE",
  passed: true,
  evidence: {
    confidence: null,
    noiseEstimate: null,
    varianceEstimate: null,
    volatilitySpecified: ppg.volatility.specified,
  },
  reason: "structural gate — math unspecified",
  specified: false,
});