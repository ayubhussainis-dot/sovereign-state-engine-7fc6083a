/**
 * F1 State Fusion
 *
 * Deterministic fusion layer for the restored F1-derived modules.
 *
 * Combines:
 * - Battlefield Environment
 * - Chassis Architecture
 * - Tire Metabolism
 * - AB-HMPTD
 * - Temporal Budget
 * - Powertrain
 * - MAIC
 * - GIST
 *
 * This layer does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG, SOALL, Risk Authority, or BrokerEngine.
 */

export interface F1StateFusionInput {
  environmentalStress: number;
  structuralIntegrity: number;
  tireDecay: number;
  performanceCapacity: number;
  temporalPressure: number;
  deploymentCapacity: number;
  cavitationScore: number;
  structuralCoherence: number;
}

export interface F1StateFusionState {
  machineStress: number;
  machineCapacity: number;
  deploymentReadiness: number;
  degraded: boolean;
  blocked: boolean;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateF1StateFusion(
  input: F1StateFusionInput,
): F1StateFusionState {
  const environmentalStress =
    clamp01(input.environmentalStress);

  const structuralIntegrity =
    clamp01(input.structuralIntegrity);

  const tireDecay =
    clamp01(input.tireDecay);

  const performanceCapacity =
    clamp01(input.performanceCapacity);

  const temporalPressure =
    clamp01(input.temporalPressure);

  const deploymentCapacity =
    clamp01(input.deploymentCapacity);

  const cavitationScore =
    clamp01(input.cavitationScore);

  const structuralCoherence =
    clamp01(input.structuralCoherence);

  const machineStress = clamp01(
    environmentalStress * 0.20 +
    (1 - structuralIntegrity) * 0.15 +
    tireDecay * 0.15 +
    (1 - performanceCapacity) * 0.15 +
    temporalPressure * 0.10 +
    (1 - deploymentCapacity) * 0.10 +
    cavitationScore * 0.10 +
    (1 - structuralCoherence) * 0.05,
  );

  const machineCapacity = clamp01(
    structuralIntegrity * 0.20 +
    (1 - tireDecay) * 0.15 +
    performanceCapacity * 0.20 +
    (1 - temporalPressure) * 0.10 +
    deploymentCapacity * 0.20 +
    (1 - cavitationScore) * 0.10 +
    structuralCoherence * 0.05,
  );

  const deploymentReadiness = clamp01(
    machineCapacity *
    (1 - machineStress),
  );

  return {
    machineStress,
    machineCapacity,
    deploymentReadiness,
    degraded: machineStress >= 0.50,
    blocked:
      machineStress >= 0.75 ||
      deploymentReadiness < 0.20,
  };
}
