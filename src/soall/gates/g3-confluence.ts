/**
 * G3 — CONFLUENCE (WITH POWERTRAIN INTEGRATION)
 * Purpose: Evaluates order flow and bounds deployment capacity via the F1 Powertrain bridge.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";
import { evaluatePowertrainBridge } from "@/engine/modules/powertrain-bridge";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg, twin, risk }): GateOutcome => {
  // Evaluate F1 Powertrain deployment metrics
  const powertrain = evaluatePowertrainBridge({
    maxPower: 100,
    currentPower: twin?.workload ? twin.workload * 100 : 30,
    deploymentDemand: Math.abs(ppg?.ofi?.value ?? 0),
    temporalRemaining: 0.8,
    capitalCapacity: risk?.capital ?? 10000,
    currentExposure: risk?.allocatedCapital ?? 1000,
  });

  const confluenceScore = Math.abs(ppg.ofi.value);
  const raw = clamp01(confluenceScore / 0.2);
  const score = clamp01((raw * 0.5) + (powertrain.usableCapitalFraction * 0.5));
  
  const passed = true; // Non-blocking telemetry feed

  return {
    gate: "G3_CONFLUENCE",
    passed,
    score,
    weight: 1,
    hardVeto: false,
    evidence: {
      ofiProxy: ppg.ofi.value,
      deploymentCapacity: powertrain.deploymentCapacity,
      usableCapitalFraction: powertrain.usableCapitalFraction,
      powerUtilization: powertrain.powerUtilization,
      overloaded: powertrain.overloaded,
    },
    reason: `confluence evaluated · usableCapital=${powertrain.usableCapitalFraction.toFixed(3)} · powerUtil=${powertrain.powerUtilization.toFixed(3)}`,
    specified: true,
  };
};
