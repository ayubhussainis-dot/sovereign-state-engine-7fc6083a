/**
 * G7 — RISK
 * Decision Criterion: pass if DD < DD_max AND L_c < L_max.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 *
 * Delegates to the existing sovereign risk primitives (`evaluateG2`,
 * `evaluateAuthority`). Both are pure and already in-repo; G7 is the
 * single auditable entry point for the pipeline.
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
  const passed = ladder.canTrade && authority.canTrade;
  return {
    gate: "G7_RISK",
    passed,
    score: passed ? Math.max(0, 1 - risk.drawdownFraction * 10) : 0,
    weight: 1,
    hardVeto: true,
    evidence: {
      drawdownFraction: risk.drawdownFraction,
      consecutiveLosses: risk.consecutiveLosses,
      ladderStatus: ladder.status,
      authorityState: authority.state,
      sizeMultiplier: ladder.sizeMultiplier,
    },
    reason: passed
      ? `${ladder.status} · ${authority.state}`
      : `${ladder.reason} · ${authority.reason}`,
    specified: true,
  };
};
