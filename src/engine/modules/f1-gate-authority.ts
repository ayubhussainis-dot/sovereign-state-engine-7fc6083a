/**
 * F1 Gate Authority
 *
 * Final deterministic safety boundary for the restored
 * F1-derived machine-state layers.
 *
 * It converts the fused machine state into an explicit
 * ALLOW / RESTRICT / BLOCK condition before the existing
 * SOALL and Risk Authority layers.
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace SOALL or Risk Authority.
 */

export interface F1GateAuthorityInput {
  machineStress: number;
  machineCapacity: number;
  deploymentReadiness: number;
  environmentalStress: number;
  structuralIntegrity: number;
  cavitationScore: number;
}

export interface F1GateAuthorityState {
  decision: F1GateDecision;
  permission: boolean;
  restriction: number;
  reason: string;
}

export type F1GateDecision =
  | "ALLOW"
  | "RESTRICT"
  | "BLOCK";

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateF1GateAuthority(
  input: F1GateAuthorityInput,
): F1GateAuthorityState {
  const machineStress =
    clamp01(input.machineStress);

  const machineCapacity =
    clamp01(input.machineCapacity);

  const deploymentReadiness =
    clamp01(input.deploymentReadiness);

  const environmentalStress =
    clamp01(input.environmentalStress);

  const structuralIntegrity =
    clamp01(input.structuralIntegrity);

  const cavitationScore =
    clamp01(input.cavitationScore);

  const restriction = clamp01(
    machineStress * 0.35 +
    (1 - machineCapacity) * 0.20 +
    (1 - deploymentReadiness) * 0.20 +
    environmentalStress * 0.10 +
    (1 - structuralIntegrity) * 0.10 +
    cavitationScore * 0.05,
  );

  if (
    machineStress >= 0.75 ||
    deploymentReadiness < 0.20 ||
    structuralIntegrity < 0.25 ||
    cavitationScore >= 0.90
  ) {
    return {
      decision: "BLOCK",
      permission: false,
      restriction,
      reason: "MACHINE_STATE_UNSAFE",
    };
  }

  if (
    machineStress >= 0.50 ||
    deploymentReadiness < 0.50 ||
    restriction >= 0.50
  ) {
    return {
      decision: "RESTRICT",
      permission: true,
      restriction,
      reason: "MACHINE_STATE_RESTRICTED",
    };
  }

  return {
    decision: "ALLOW",
    permission: true,
    restriction,
    reason: "MACHINE_STATE_STABLE",
  };
}
