/**
 * G7 — RISK
 * Decision Criterion: pass if DD < DD_max AND L_c < L_max.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * Updated: Added safe optional chaining and conditional hardVeto for smooth risk scaling.
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

  const passed = ladder.canTrade && authority.canTrade;
  
  // Graceful score calculation with safety fallback
  const score = passed ? Math.max(0, 1 - drawdownFraction * 10) : 0.05;

  // Conditional hardVeto: Only hard-lock on catastrophic drawdown or authority lockdown
  const hardVeto = drawdownFraction > 0.12 || authority.state === "LOCKDOWN";

  return {
    gate: "G7_RISK",
    passed,
    score,
    weight: 1,
    hardVeto,
    evidence: {
      drawdownFraction,
      consecutiveLosses,
      ladderStatus: ladder.status,
      authorityState: authority.state,
      sizeMultiplier: ladder.sizeMultiplier,
    },
    reason: passed
      ? `${ladder.status} · ${authority.state}`
      : `Risk caution: ${ladder.reason} · ${authority.reason}`,
    specified: true,
  };
};
