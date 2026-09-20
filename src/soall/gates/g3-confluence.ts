/**
 * G3 — CONFLUENCE (POWERTRAIN DEPLOYMENT GATE)
 *
 * Purpose:
 *   Evaluate order-flow strength and verify that the F1 Powertrain
 *   has sufficient deployment capacity before execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe
 *
 * G3 answers:
 *   "Is there enough directional flow AND enough machine capacity
 *    to consider deploying capital?"
 *
 * It does NOT decide BUY vs SELL.
 * Direction is handled by the directional/fusion layer.
 */

import type { Gate, GateOutcome } from "../types";
import { evaluatePowertrainBridge } from "@/engine/modules/powertrain-bridge";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

const MIN_OFI = 0.05;

const MIN_USABLE_CAPITAL = 0.25;

export const g3Confluence: Gate = ({
  ppg,
  twin,
  risk,
}): GateOutcome => {
  const ofi =
    ppg?.ofi?.value ?? 0;

  const powertrain =
    evaluatePowertrainBridge({
      maxPower: 100,

      currentPower:
        twin?.workload !== undefined
          ? twin.workload * 100
          : 30,

      deploymentDemand:
        Math.abs(ofi),

      temporalRemaining: 0.8,

      capitalCapacity:
        risk?.capital ?? 10000,

      currentExposure:
        risk?.allocatedCapital ?? 1000,
    });

  const ofiStrength =
    clamp01(
      Math.abs(ofi) / 0.2
    );

  const usableCapitalFraction =
    clamp01(
      powertrain.usableCapitalFraction
    );

  const score =
    clamp01(
      ofiStrength * 0.5 +
      usableCapitalFraction * 0.5
    );

  const flowSufficient =
    Math.abs(ofi) >= MIN_OFI;

  const powertrainHealthy =
    !powertrain.overloaded;

  const capitalSufficient =
    usableCapitalFraction >=
    MIN_USABLE_CAPITAL;

  const passed =
    flowSufficient &&
    powertrainHealthy &&
    capitalSufficient;

  /*
   * G3 is a quality/confluence gate.
   * Failure contributes to the gate result and score,
   * but does not independently stop execution.
   */
  const hardVeto = false;

  return {
    gate: "G3_CONFLUENCE",

    passed,

    score,

    weight: 1.0,

    hardVeto,

    evidence: {
      ofiProxy: ofi,
      ofiMagnitude:
        Math.abs(ofi),

      minimumOfi:
        MIN_OFI,

      deploymentCapacity:
        powertrain.deploymentCapacity,

      usableCapitalFraction,

      minimumUsableCapital:
        MIN_USABLE_CAPITAL,

      powerUtilization:
        powertrain.powerUtilization,

      overloaded:
        powertrain.overloaded,

      flowSufficient,

      powertrainHealthy,

      capitalSufficient,
    },

    reason: passed
      ? `confluence sufficient · OFI=${ofi.toFixed(
          3
        )} · usableCapital=${usableCapitalFraction.toFixed(
          3
        )} · powerUtil=${powertrain.powerUtilization.toFixed(
          3
        )}`
      : `confluence insufficient · OFI=${ofi.toFixed(
          3
        )} · usableCapital=${usableCapitalFraction.toFixed(
          3
        )} · powerUtil=${powertrain.powerUtilization.toFixed(
          3
        )} · QUALITY FAIL`,

    specified: true,
  };
};
