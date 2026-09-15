/**
 * F1 State Types
 *
 * Shared type definitions for the restored F1-derived
 * deterministic machine-state architecture.
 *
 * This file contains types only.
 * It performs no calculations and makes no decisions.
 */

export type F1MachineStatus =
  | "STABLE"
  | "ACTIVE"
  | "STRESSED"
  | "RESTRICTED"
  | "BLOCKED";

export interface F1MachineState {
  environmentalStress: number;
  structuralIntegrity: number;
  tireDecay: number;
  performanceCapacity: number;
  temporalPressure: number;
  deploymentCapacity: number;
  cavitationScore: number;
  structuralCoherence: number;
  machineStress: number;
  machineCapacity: number;
  deploymentReadiness: number;
  status: F1MachineStatus;
}

export interface F1GateState {
  decision: "ALLOW" | "RESTRICT" | "BLOCK";
  permission: boolean;
  restriction: number;
  reason: string;
}
