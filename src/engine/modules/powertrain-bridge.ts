/**
 * Powertrain Bridge
 *
 * Connects the F1-derived Powertrain layer to the
 * capital-deployment pipeline.
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

import {
  evaluatePowertrain,
  type PowertrainInput,
  type PowertrainState,
} from "./powertrain";

export interface PowertrainBridgeInput
  extends PowertrainInput {
  capitalCapacity: number;
  currentExposure: number;
}

export interface PowertrainBridgeState
  extends PowertrainState {
  capitalCapacity: number;
  currentExposure: number;
  usableCapitalFraction: number;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluatePowertrainBridge(
  input: PowertrainBridgeInput,
): PowertrainBridgeState {
  const capitalCapacity =
    Math.max(0, input.capitalCapacity);

  const currentExposure =
    Math.max(0, Math.abs(input.currentExposure));

  const exposureFraction =
    capitalCapacity > 0
      ? clamp01(currentExposure / capitalCapacity)
      : 1;

  const deploymentDemand = clamp01(
    Math.max(
      input.deploymentDemand,
      exposureFraction,
    ),
  );

  const state = evaluatePowertrain({
    maxPower: input.maxPower,
    currentPower: input.currentPower,
    deploymentDemand,
    temporalRemaining: input.temporalRemaining,
  });

  const usableCapitalFraction = clamp01(
    state.deploymentCapacity *
    (1 - exposureFraction),
  );

  return {
    ...state,
    capitalCapacity,
    currentExposure,
    usableCapitalFraction,
  };
}
