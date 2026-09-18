/**
 * G8 — AUTHORITY
 * Decision Criterion: pass if AuthorityToken == 1 AND H ≠ LOCKED_DOWN.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 *
 * The AuthorityToken is derived from the cumulative pass vector: every
 * mandatory gate must have passed. Absolute veto power resides here.
 */

import type { Gate, GateId, GateOutcome } from "../types";

// Enforce that all core gates (including our newly tuned filters) must pass
const REQUIRED: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G3_CONFLUENCE",
  "G4_PATTERN",
  "G5_EXAMINATION",
  "G6_CONFIDENCE",
  "G7_RISK"
];

export const g8Authority: Gate = ({ priorPasses, risk }): GateOutcome => {
  const passedSet = new Set(priorPasses);
  const missing = REQUIRED.filter((g) => !passedSet.has(g));
  const healthy = risk.systemHealth !== "LOCKED_DOWN";
  const passed = missing.length === 0 && healthy;

  return {
    gate: "G8_AUTHORITY",
    passed,
    score: passed ? 1 : 0,
    weight: 1,
    hardVeto: true,
    evidence: {
      authorityToken: passed ? 1 : 0,
      systemHealth: risk.systemHealth,
      missingGates: missing,
    },
    reason: passed
      ? "authority granted · all gates cleared"
      : !healthy
        ? `system health ${risk.systemHealth}`
        : `missing required passes: ${missing.join(",")}`,
    specified: true,
  };
};
