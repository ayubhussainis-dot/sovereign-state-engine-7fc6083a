/**
 * G4 — PATTERN (STRUCTURAL FORMATION SCORING)
 * Purpose: Scores chart pattern alignments without halting execution.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g4Pattern: Gate = ({ pattern }): GateOutcome => {
  const confidence = pattern?.confidence ?? 0.75;

  return {
    gate: "G4_PATTERN",
    passed: true,          // Non-blocking score feed
    score: confidence,     
    weight: 1.0,
    hardVeto: false,
    evidence: { patternType: pattern?.type ?? "NONE", confidence },
    reason: `pattern evaluated · confidence=${confidence.toFixed(3)}`,
    specified: true,
  };
};
