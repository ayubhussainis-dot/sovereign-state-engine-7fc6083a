/**
 * G8 — AUTHORITY (NON-BLOCKING TELEMETRY FEED)
 * Purpose: Final executive telemetry aggregator. Reports system authority state without halting flow.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g8Authority: Gate = ({ priorPasses, risk }): GateOutcome => {
  const healthy = risk.systemHealth !== "LOCKED_DOWN";

  return {
    gate: "G8_AUTHORITY",
    passed: true,          // Non-blocking: always passes to ensure continuous flow
    score: healthy ? 1.0 : 0.5,
    weight: 1.0,
    hardVeto: false,       // Removed hard stop so it never halts execution
    evidence: {
      authorityToken: 1,
      systemHealth: risk.systemHealth,
      totalPriorPasses: priorPasses?.length ?? 0,
      systemNominal: healthy,
    },
    reason: healthy
      ? "authority telemetry nominal · flow active"
      : `authority warning (non-blocking) · system health ${risk.systemHealth}`,
    specified: true,
  };
};
