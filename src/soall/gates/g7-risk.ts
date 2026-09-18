/**
 * G7 — RISK (ABHMPTD CAPITAL-RESERVE INTEGRATION)
 * Purpose: Evaluates drawdown and capital deployment capacity via your ABHMPTD module.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";
import { evaluateABHMPTD } from "@/engine/modules/ab-hmptd";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g7Risk: Gate = ({ risk, twin }): GateOutcome => {
  const drawdownFraction = risk?.drawdownFraction ?? 0;
  const consecutiveLosses = risk?.consecutiveLosses ?? 0;

  // Evaluate your deterministic ABHMPTD capital-reserve state
  const abhState = evaluateABHMPTD({
    capital: risk?.capital ?? 10000,
    allocatedCapital: risk?.allocatedCapital ?? 1000,
    workload: twin?.workload ?? 0.3,
    recovery: risk?.recovery ?? 0.8,
    environmentalStress: risk?.stress ?? 0.1,
  });

  const baseScore = clamp01(1 - (drawdownFraction * 3.0));
  let frictionPenalty = 0;
  
  if (consecutiveLosses >= 3) frictionPenalty += 0.3;
  if (abhState.depleted) frictionPenalty += 0.6; // Triggers friction if ABHMPTD flags depletion

  const finalScore = clamp01(baseScore - frictionPenalty);
  
  // Hard boundary check using your deployment capacity and depletion flag
  const isHealthy = finalScore >= 0.50 && !abhState.depleted;

  return {
    gate: "G7_RISK",
    passed: isHealthy,
    score: finalScore,
    weight: 2.0,
    hardVeto: true,
    evidence: {
      drawdownFraction,
      consecutiveLosses,
      deploymentCapacity: abhState.deploymentCapacity,
      performanceCapacity: abhState.performanceCapacity,
      depleted: abhState.depleted
    },
    reason: isHealthy
      ? `risk nominal · ABHMPTD reserve stable · score=${finalScore.toFixed(3)}`
      : `RISK VETO: ABHMPTD capital reserve depleted or drawdown high · score=${finalScore.toFixed(3)}`,
    specified: true,
  };
};
