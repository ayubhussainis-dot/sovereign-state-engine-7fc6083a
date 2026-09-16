/**
 * F1 State Engine
 *
 * Deterministic orchestration layer for the restored
 * F1-derived machine-state modules.
 *
 * This engine evaluates the machine state in sequence:
 *
 * Battlefield
 * → Chassis
 * → Tire Metabolism
 * → AB-HMPTD
 * → Temporal Budget
 * → Powertrain
 * → MAIC
 * → GIST
 * → State Fusion
 * → Gate Authority
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT bypass SOALL or Risk Authority.
 */

import {
  evaluateF1StateFusion,
  type F1StateFusionState,
} from "./f1-state-fusion";

import {
  evaluateF1GateAuthority,
  type F1GateAuthorityState,
} from "./f1-gate-authority";

import type {
  F1MachineState,
  F1GateState,
} from "./f1-state-types";

export interface F1StateEngineInput {
  environmentalStress: number;
  structuralIntegrity: number;
  tireDecay: number;
  performanceCapacity: number;
  temporalPressure: number;
  deploymentCapacity: number;
  cavitationScore: number;
  structuralCoherence: number;
}

export interface F1StateEngineState {
  machine: F1MachineState;
  gate: F1GateState;
  fusion: F1StateFusionState;
  authority: F1GateAuthorityState;
}

export function evaluateF1StateEngine(
  input: F1StateEngineInput,
): F1StateEngineState {
  const fusion = evaluateF1StateFusion(input);

  const authority = evaluateF1GateAuthority({
    machineStress: fusion.machineStress,
    machineCapacity: fusion.machineCapacity,
    deploymentReadiness: fusion.deploymentReadiness,
    environmentalStress: input.environmentalStress,
    structuralIntegrity: input.structuralIntegrity,
    cavitationScore: input.cavitationScore,
  });

  let status: F1MachineState["status"];

  if (authority.decision === "BLOCK") {
    status = "BLOCKED";
  } else if (authority.decision === "RESTRICT") {
    status = "RESTRICTED";
  } else if (fusion.machineStress >= 0.50) {
    status = "STRESSED";
  } else if (fusion.machineCapacity < 0.75) {
    status = "ACTIVE";
  } else {
    status = "STABLE";
  }

  const machine: F1MachineState = {
    ...input,
    machineStress: fusion.machineStress,
    machineCapacity: fusion.machineCapacity,
    deploymentReadiness: fusion.deploymentReadiness,
    status,
  };

  const gate: F1GateState = {
    decision: authority.decision,
    permission: authority.permission,
    restriction: authority.restriction,
    reason: authority.reason,
  };

  return {
    machine,
    gate,
    fusion,
    authority,
  };
}
