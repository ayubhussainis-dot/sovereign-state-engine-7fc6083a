/**
 * G8 — AUTHORITY
 * Decision Criterion: pass if AuthorityToken == 1 AND H ≠ LOCKED_DOWN.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * Updated: Added safe optional chaining, resilient array/health defaults, and conditional hard veto.
 */

import type { Gate, GateId, GateOutcome } from "../types";

// Enforce core gates required for final execution authority
const REQUIRED: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G3_CONFLUENCE",
  "G4_PATTERN",
  "G5_EXAMINATION",
  "G6_CONFIDENCE",
  "G7_RISK"
];

export const g8Authority: Gate = ({ priorPasses, risk }): GateOutcome => {
  const passes = priorPasses ?? [];
  const passedSet = new Set(passes);
  const missing = REQUIRED.filter((g) => !passedSet.has(g));
  
  const systemHealth = risk?.systemHealth ?? "NORMAL";
  const healthy = systemHealth !== "LOCKED_DOWN";
  
  const passed = missing.length === 0 && healthy;

  return {
    gate: "G8_AUTHORITY",
    passed,
    score: passed ? 1 : 0.1, // Graceful degradation score instead of absolute zero
    weight: 1,
    hardVeto: !healthy, // Hard veto only triggers if system health is explicitly locked down
    evidence: {
      authorityToken: passed ? 1 : 0,
      systemHealth,
      missingGates: missing,
    },
    reason: passed
      ? "authority granted · all gates cleared"
      : !healthy
        ? `system health lockdown: ${systemHealth}`
        : `missing required passes: ${missing.join(",")}`,
    specified: true,
  };
};
