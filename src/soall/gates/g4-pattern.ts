/**
 * G4 — PATTERN
 * Decision Criterion: pass if PatternFriction ≤ Threshold_friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: PatternFriction composition and threshold are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

export const g4Pattern: Gate = ({ ppg }): GateOutcome => ({
  gate: "G4_PATTERN",
  passed: true,
  evidence: {
    volatility: ppg.volatility.value,
    volatilitySpecified: ppg.volatility.specified,
    spread: ppg.spread.value,
    spreadSpecified: ppg.spread.specified,
    friction: null,
  },
  reason: "structural gate — math unspecified",
  specified: false,
});