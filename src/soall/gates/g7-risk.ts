/**
 * G7 — RISK (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates drawdown and consecutive losses with expanded flow buffer.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import { evaluateG2 } from "@/engine/sovereign/g2-checkpoint";
import { evaluateAuthority } from "@/engine/sovereign/risk-authority";
import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g7Risk: Gate = ({ risk }): GateOutcome => {
  const drawdownFraction = risk?.drawdownFraction ?? 0;
  const consecutiveLosses = risk?.consecutiveLosses ?? 0;

  const ladder = evaluateG2(drawdownFraction);
  const authority = evaluateAuthority({
    drawdownFraction,
    consecutiveLosses,
  });

  // 1. Base Score calculation with expanded buffer (scaled to 0.50 tolerance)
  const baseScore = clamp01(1 - (drawdownFraction * 3.0));

  // 2. Natural Risk Friction (Balanced Flow)
  let frictionPenalty = 0;

  if (consecutiveLosses >= 3) {
    frictionPenalty += 0.3; // Softer penalty to prevent immediate lockouts
  }
  
  if (authority.state === "LOCKED_DOWN") {
    frictionPenalty += 0.6;
  }

  // 3. Final Score Calculation
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 4. Adjusted Threshold (Shifted to 0.50 buffer flow)
  const isHealthy = finalScore >= 0.50;

  return {
    gate: "G7_RISK",
    passed: isHealthy,
    score: finalScore,
    weight: 1.0,
    hardVeto: false,
    evidence: {
      drawdownFraction,
      consecutiveLosses,
      ladderStatus: ladder.status,
      authorityState: authority.state,
      sizeMultiplier: ladder.sizeMultiplier,
      frictionPenalty
    },
    reason: isHealthy
      ? `risk tolerances stable · flow buffer active (0.50) · score=${finalScore.toFixed(3)}`
      : `SOFT VETO: elevated risk / drawdown buffer reached · score=${finalScore.toFixed(3)}`,
    specified: true,
  };
};
