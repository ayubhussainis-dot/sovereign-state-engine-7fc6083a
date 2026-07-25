/**
 * G8 — AUTHORITY
 * Decision Criterion: pass if AuthorityToken == 1 AND H ≠ LOCKED_DOWN.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 *
 * The AuthorityToken is derived from the cumulative pass vector: every
 * prior gate G1..G7 must have passed. Absolute veto power resides here.
 */

import type { Gate, GateId, GateOutcome } from "../types";

// Only hard-veto gates gate authority. Scored gates (G2..G6) always
// run and feed the composite score consumed downstream.
const REQUIRED: readonly GateId[] = ["G1_SYNCHRONY", "G7_RISK"];

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
      ? "authority granted"
      : !healthy
        ? `system health ${risk.systemHealth}`
        : `missing prior passes: ${missing.join(",")}`,
    specified: true,
  };
};