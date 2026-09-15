/**
 * AB-HMPTD
 *
 * Adaptive Biological-Human-Machine Performance Twin
 * translated into a deterministic capital-reserve layer.
 *
 * The module represents available performance reserve:
 * - Capital buffer
 * - Current workload
 * - Recovery reserve
 * - Performance capacity
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

export interface ABHMPTDInput {
  capital: number;
  allocatedCapital: number;
  workload: number;
  recovery: number;
  environmentalStress: number;
}

export interface ABHMPTDState {
  capitalReserve: number;
  workload: number;
  recoveryReserve: number;
  performanceCapacity: number;
  deploymentCapacity: number;
  depleted: boolean;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateABHMPTD(
  input: ABHMPTDInput,
): ABHMPTDState {
  const capital =
    Math.max(0, input.capital);

  const allocatedCapital =
    Math.max(0, input.allocatedCapital);

  const capitalReserve =
    capital > 0
      ? clamp01(1 - allocatedCapital / capital)
      : 0;

  const workload =
    clamp01(input.workload);

  const recoveryReserve =
    clamp01(input.recovery);

  const environmentalStress =
    clamp01(input.environmentalStress);

  const performanceCapacity = clamp01(
    capitalReserve * 0.35 +
    recoveryReserve * 0.30 +
    (1 - workload) * 0.20 +
    (1 - environmentalStress) * 0.15,
  );

  const deploymentCapacity = clamp01(
    performanceCapacity *
    capitalReserve *
    (1 - environmentalStress),
  );

  return {
    capitalReserve,
    workload,
    recoveryReserve,
    performanceCapacity,
    deploymentCapacity,
    depleted: deploymentCapacity < 0.20,
  };
}
