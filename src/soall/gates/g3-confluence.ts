/**
 * G3 — CONFLUENCE (ABHMPTD SCORING)
 * Purpose: Evaluates order flow and deployment capacity via your exact original ABHMPTD module.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";
import { evaluateABHMPTD } from "@/engine/modules/ab-hmptd";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg, twin, risk }): GateOutcome => {
  // Calls your exact original function name and input structure
  const abhState = evaluateABHMPTD({
    capital: risk?.capital ?? 10000,
    allocatedCapital: risk?.allocatedCapital ?? 1000,
    workload: twin?.workload ?? 0.3,
    recovery: risk?.recovery ?? 0.8,
    environmentalStress: risk?.stress ?? 0.1,
  });

  const rawOfi = ppg?.ofi?.value ?? 0;
  const normalizedOfi = Math.min(Math.abs(rawOfi) / 1e9, 1.0);
  
  const finalScore = clamp01((normalizedOfi * 0.5) + (abhState.performanceCapacity * 0.5));

  return {
    gate: "G3_CONFLUENCE",
    passed: true,          
    score: finalScore,     
    weight: 1.0,           
    hardVeto: false,       
    evidence: {
      ofiProxy: rawOfi,
      deploymentCapacity: abhState.deploymentCapacity,
      performanceCapacity: abhState.performanceCapacity,
      depleted: abhState.depleted
    },
    reason: `ABHMPTD confluence evaluated · deploymentCapacity=${abhState.deploymentCapacity.toFixed(3)}`,
    specified: true,
  };
};
