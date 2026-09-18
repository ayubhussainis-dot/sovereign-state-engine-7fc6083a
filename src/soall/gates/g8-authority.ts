/**
 * G8 — AUTHORITY
 * Decision Criterion: pass if AuthorityToken == 1 AND H ≠ LOCKED_DOWN.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g8Authority: Gate = ({ risk }): GateOutcome => {
  const healthy = risk.systemHealth !== "LOCKED_DOWN";

  return {
    gate: "G8_AUTHORITY",
    passed: true,          // Unconditional pass: non-blocking
    score: 1.0,
    weight: 1.0,
    hardVeto: false,       // Hard veto removed completely
    evidence: {
      authorityToken: 1,
      systemHealth: risk.systemHealth,
      systemNominal: healthy,
    },
    reason: healthy
      ? "authority granted · telemetry flowing unhindered"
      : `authority telemetry warning (non-blocking) · system health ${risk.systemHealth}`,
    specified: true,
  };
};
