/**
 * G7 — RISK (POWERTRAIN CAPACITY & DRAWDOWN GUARDIAN)
 * Purpose: The primary risk boundary gate. Enforces capital deployment capacity and drawdown limits.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import { evaluateG2 } from "@/engine/sovereign/g2-checkpoint";
import { evaluateAuthority } from "@/engine/sovereign/risk-authority";
import { evaluatePowertrain } from "@/engine/modules/powertrain";
import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g7Risk: Gate = ({ risk, powertrainInput }): GateOutcome => {
  const drawdownFraction = risk?.drawdownFraction ?? 0;
  const consecutiveLosses = risk?.consecutiveLosses ?? 0;

  const ptState = evaluatePowertrain(powertrainInput ?? {
    maxPower: 100,
    currentPower: 80,
    deploymentDemand: 50,
    temporalRemaining: 1000
  });

  const baseScore = clamp01(1 - (drawdownFraction * 3.0));
  let frictionPenalty = 0;
  
  if (consecutiveLosses >= 3) frictionPenalty += 0.3;
  if (ptState.overloaded) frictionPenalty += 0.5;

  const finalScore = clamp01(baseScore - frictionPenalty);
  
  // HARD BOUNDARY GATE: G7 actively decides pass/fail based on rigorous risk metrics
  const isHealthy = finalScore >= 0.50 && !ptState.overloaded;

  return {
    gate: "G7_RISK",
    passed: isHealthy,     // ACTIVE RISK VETO BOUNDARY
    score: finalScore,
    weight: 2.0,           // Higher weight to influence final decision
    hardVoe: true,         // Enforces risk control
    evidence: {
      drawdownFraction,
      consecutiveLosses,
      deploymentCapacity: ptState.deploymentCapacity,
      overloaded: ptState.overloaded
    },
    reason: isHealthy
      ? `risk nominal · powertrain capacity stable · score=${finalScore.toFixed(3)}`
      : `RISK VETO: drawdown threshold or powertrain overload reached · score=${finalScore.toFixed(3)}`,
    specified: true,
  };
};
