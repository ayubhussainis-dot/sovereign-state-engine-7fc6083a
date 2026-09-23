/**
 * G3 — CONFLUENCE (POWERTRAIN DEPLOYMENT & SOVEREIGN FLOW GATE)
 *
 * Purpose:
 *   Evaluate order-flow strength and verify that the F1 Powertrain
 *   has sufficient deployment capacity and sovereign kinetic flow before execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe
 *
 * Behavior:
 *   - Strong order flow, safe workload, and sufficient capital -> PASS
 *   - Flaccid flow or powertrain overloaded -> FAIL
 *   - G3 remains a quality gate, not a hard execution veto.
 */

import type { Gate, GateOutcome } from "../types";
import { evaluatePowertrainBridge } from "@/engine/modules/powertrain-bridge";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

const MIN_OFI = 0.05;
const MIN_USABLE_CAPITAL = 0.25;
const SOVEREIGN_FLOW_KINETIC_TARGET = 0.20; // Corresponds to high-impact 80k velocity windows

export const g3Confluence: Gate = ({
  ppg,
  twin,
  risk,
}): GateOutcome => {
  const ofi = ppg?.ofi?.value ?? 0;

  // Track the raw workload profile to monitor high-frequency kinetic surges
  const rawWorkload = twin?.workload !== undefined ? twin.workload : 0.3;

  const powertrain = evaluatePowertrainBridge({
    maxPower: 100,

    currentPower: rawWorkload * 100,

    deploymentDemand: Math.abs(ofi),

    temporalRemaining: 0.8,

    capitalCapacity: risk?.capital ?? 10000,

    currentExposure: risk?.allocatedCapital ?? 1000,
  });

  // Calculate the base order flow energy magnitude
  let ofiStrength = clamp01(Math.abs(ofi) / 0.2);

  // --- SOVEREIGN KINETIC RE-WEIGHTING ---
  // If the system is actively TRAPPING or MANAGING, and we detect a heavy 80k-style volume block,
  // we optimize the OFI strength calculation to signal maximum confluence profile validity
  let sovereignFlowSurgeDetected = false;
  if (Math.abs(ofi) >= SOVEREIGN_FLOW_KINETIC_TARGET || rawWorkload >= 0.8) {
    sovereignFlowSurgeDetected = true;
    ofiStrength = 1.0; // Structural flow is highly optimal for trapping elastic reversals
  }

  const usableCapitalFraction = clamp01(powertrain.usableCapitalFraction);

  // Balanced aggregate scoring metric
  const score = clamp01(ofiStrength * 0.5 + usableCapitalFraction * 0.5);

  const flowSufficient = Math.abs(ofi) >= MIN_OFI || sovereignFlowSurgeDetected;

  const powertrainHealthy = !powertrain.overloaded;

  const capitalSufficient = usableCapitalFraction >= MIN_USABLE_CAPITAL;

  const passed = flowSufficient && powertrainHealthy && capitalSufficient;

  /*
   * G3 is a quality/confluence gate.
   * Failure contributes to the gate result and score,
   * but does not independently stop execution.
   */
  const hardVeto = false;

  const flowLabel = sovereignFlowSurgeDetected ? "SOVEREIGN_HIGH_FLOW_80K" : `OFI=${ofi.toFixed(3)}`;

  return {
    gate: "G3_CONFLUENCE",

    passed,

    score,

    weight: 1.0,

    hardVeto,

    evidence: {
      ofiProxy: ofi,
      ofiMagnitude: Math.abs(ofi),
      minimumOfi: MIN_OFI,
      deploymentCapacity: powertrain.deploymentCapacity,
      usableCapitalFraction,
      minimumUsableCapital: MIN_USABLE_CAPITAL,
      powerUtilization: powertrain.powerUtilization,
      overloaded: powertrain.overloaded,
      flowSufficient,
      powertrainHealthy,
      capitalSufficient,
      
      // Extended structural metrics for the audit ledger
      sovereignFlowSurgeDetected,
      rawWorkload,
      positionState: risk?.positionState ?? "FLAT"
    },

    reason: passed
      ? `Confluence sufficient · ${flowLabel} · usableCapital=${usableCapitalFraction.toFixed(3)} · powerUtil=${powertrain.powerUtilization.toFixed(3)}`
      : `Confluence insufficient · ${flowLabel} · usableCapital=${usableCapitalFraction.toFixed(3)} · powerUtil=${powertrain.powerUtilization.toFixed(3)} · QUALITY FAIL`,

    specified: true,
  };
};
