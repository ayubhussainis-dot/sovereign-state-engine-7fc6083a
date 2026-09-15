/**
 * Powertrain
 *
 * F1-derived capital deployment capacity layer.
 *
 * Translates available "power" into a bounded deployment capacity.
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

export interface PowertrainInput {
  maxPower: number;
  currentPower: number;
  deploymentDemand: number;
  temporalRemaining: number;
}

export interface PowertrainState {
  powerUtilization: number;
  deploymentReserve: number;
  deploymentCapacity: number;
  overloaded: boolean;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluatePowertrain(
  input: PowertrainInput,
): PowertrainState {
  const maxPower = Math.max(0, input.maxPower);
  const currentPower = Math.max(0, input.currentPower);

  const powerUtilization =
    maxPower > 0
      ? clamp01(currentPower / maxPower)
      : 1;

  const deploymentDemand =
    clamp01(input.deploymentDemand);

  const temporalRemaining =
    clamp01(input.temporalRemaining);

  const deploymentReserve =
    clamp01(1 - powerUtilization);

  const deploymentCapacity = clamp01(
    deploymentReserve * 0.40 +
    (1 - deploymentDemand) * 0.35 +
    temporalRemaining * 0.25,
  );

  return {
    powerUtilization,
    deploymentReserve,
    deploymentCapacity,
    overloaded: powerUtilization >= 0.90,
  };
}
