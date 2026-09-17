/**
 * G7 — RISK (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Pure risk telemetry observer. Zero blocking, zero friction, zero emergency locks.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import { evaluateG2 } from "@/engine/sovereign/g2-checkpoint";
import { evaluateAuthority } from "@/engine/sovereign/risk-authority";
import type { Gate, GateOutcome } from "../types";

export const g7Risk: Gate = ({ risk }): GateOutcome => {
  const drawdownFraction = risk?.drawdownFraction ?? 0;
  const consecutiveLosses = risk?.consecutiveLosses ?? 0;

  const ladder = evaluateG2(drawdownFraction);
  const authority = evaluateAuthority({
    drawdownFraction,
    consecutiveLosses,
  });

  const rawScore = Math.max(0.1, 1 - drawdownFraction * 5);
  const score = rawScore > 0 ? rawScore : 1.0;

  return {
    gate: "G7_RISK",
    passed: true,          // Absolute pass-through: observe risk metrics, never restrict execution
    score,
    weight: 1,
    hardVeto: false,       // Zero veto power, zero emergency locks
    evidence: {
      drawdownFraction,
      consecutiveLosses,
      ladderStatus: ladder.status,
      authorityState: authority.state,
      sizeMultiplier: ladder.sizeMultiplier,
    },
    reason: `safety harness observing freely · ${ladder.status} · ${authority.state} · zero restriction`,
    specified: true,
  };
};
