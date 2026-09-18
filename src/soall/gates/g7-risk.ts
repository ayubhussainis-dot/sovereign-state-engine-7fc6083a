/**
 * G7 — RISK (NON-BLOCKING TELEMETRY FEED)
 * Purpose: Evaluates drawdown and risk parameters as a pure score without hard-stopping execution.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import { evaluateG2 } from "@/engine/sovereign/g2-checkpoint";
import { evaluateAuthority } from "@/engine/sovereign/risk-authority";
import type { Gate, GateOutcome } from "../types";

export const g7Risk: Gate = ({ risk }): GateOutcome => {
  const ladder = evaluateG2(risk.drawdownFraction);
  const authority = evaluateAuthority({
    drawdownFraction: risk.drawdownFraction,
    consecutiveLosses: risk.consecutiveLosses,
  });
  
  const canTrade = ladder.canTrade && authority.canTrade;
  const score = Math.max(0, 1 - (risk.drawdownFraction * 10));

  return {
    gate: "G7_RISK",
    passed: true,          // Non-blocking: lets flow continue while reporting risk state
    score,
    weight: 1,
    hardVeto: false,       // Removed hard stop so it never halts execution
    evidence: {
      drawdownFraction: risk.drawdownFraction,
      consecutiveLosses: risk.consecutiveLosses,
      ladderStatus: ladder.status,
      authorityState: authority.state,
      sizeMultiplier: ladder.sizeMultiplier,
      riskPermitted: canTrade,
    },
    reason: canTrade
      ? `risk nominal · ${ladder.status} · ${authority.state}`
      : `risk warning (non-blocking) · ${ladder.reason} · ${authority.reason}`,
    specified: true,
  };
};
