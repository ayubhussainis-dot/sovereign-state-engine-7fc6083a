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

/*
 * Minimum absolute OFI required for meaningful order-flow
 * confirmation.
 *
 * OFI is normalized approximately between -1 and +1.
 * 0.05 means there must be at least 5% net directional
 * imbalance before G3 considers flow meaningful.
 */
const MIN_OFI = 0.05;

/*
 * Minimum amount of usable capital that must remain available
 * for deployment.
 */
const MIN_USABLE_CAPITAL = 0.25;

export const g3Confluence: Gate = ({
  ppg,
  twin,
  risk,
}): GateOutcome => {
  /*
   * Read OFI safely.
   *
   * If PPG has not produced an OFI value yet, treat it as
   * zero rather than allowing the trade through.
   */
  const ofi = ppg?.ofi?.value ?? 0;

  /*
   * Powertrain deployment calculation.
   */
  const powertrain = evaluatePowertrainBridge({
    maxPower: 100,

    currentPower:
      twin?.workload !== undefined
        ? twin.workload * 100
        : 30,

    deploymentDemand: Math.abs(ofi),

    temporalRemaining: 0.8,

    capitalCapacity:
      risk?.capital ?? 10000,

    currentExposure:
      risk?.allocatedCapital ?? 1000,
  });

  /*
   * OFI strength.
   *
   * 0.00  = no directional flow
   * 0.05  = minimum acceptable flow
   * 0.20+ = full OFI contribution
   */
  const ofiStrength = clamp01(Math.abs(ofi) / 0.2);

  /*
   * Powertrain capacity.
   */
  const usableCapitalFraction = clamp01(
    powertrain.usableCapitalFraction
  );

  /*
   * Combined informational score.
   *
   * Flow and machine capacity each contribute 50%.
   */
  const score = clamp01(
    ofiStrength * 0.5 +
      usableCapitalFraction * 0.5
  );

  /*
   * Actual gate conditions.
   *
   * G3 passes only when:
   *
   * 1. There is meaningful order flow.
   * 2. The Powertrain is not overloaded.
   * 3. Enough usable capital remains.
   */
  const flowSufficient =
    Math.abs(ofi) >= MIN_OFI;

  const powertrainHealthy =
    !powertrain.overloaded;

  const capitalSufficient =
    usableCapitalFraction >= MIN_USABLE_CAPITAL;

  const passed =
    flowSufficient &&
    powertrainHealthy &&
    capitalSufficient;

  /*
   * Any failure here means deployment should not proceed.
   */
  const hardVeto = !passed;

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
        )} · EXECUTION VETO`,

    specified: true,
  };
};
