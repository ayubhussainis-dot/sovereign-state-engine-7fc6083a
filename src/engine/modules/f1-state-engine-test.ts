/**
 * F1 State Engine Tests
 *
 * Verifies the deterministic safety behavior of the restored
 * F1-derived machine-state layer.
 */

import { describe, expect, it } from "vitest";

import {
  evaluateF1StateEngine,
} from "./f1-state-engine";

describe("F1 State Engine", () => {
  it("allows a stable machine state", () => {
    const result = evaluateF1StateEngine({
      environmentalStress: 0.10,
      structuralIntegrity: 0.95,
      tireDecay: 0.05,
      performanceCapacity: 0.90,
      temporalPressure: 0.10,
      deploymentCapacity: 0.90,
      cavitationScore: 0.05,
      structuralCoherence: 0.95,
    });

    expect(result.gate.decision).toBe("ALLOW");
    expect(result.gate.permission).toBe(true);
    expect(result.machine.status).toBe("STABLE");
  });

  it("restricts a stressed machine state", () => {
    const result = evaluateF1StateEngine({
      environmentalStress: 0.60,
      structuralIntegrity: 0.55,
      tireDecay: 0.55,
      performanceCapacity: 0.50,
      temporalPressure: 0.55,
      deploymentCapacity: 0.45,
      cavitationScore: 0.50,
      structuralCoherence: 0.55,
    });

    expect(result.gate.decision).toBe("RESTRICT");
    expect(result.gate.permission).toBe(true);
    expect(result.machine.status).toBe("RESTRICTED");
  });

  it("blocks an unsafe machine state", () => {
    const result = evaluateF1StateEngine({
      environmentalStress: 0.90,
      structuralIntegrity: 0.15,
      tireDecay: 0.90,
      performanceCapacity: 0.10,
      temporalPressure: 0.90,
      deploymentCapacity: 0.10,
      cavitationScore: 0.95,
      structuralCoherence: 0.10,
    });

    expect(result.gate.decision).toBe("BLOCK");
    expect(result.gate.permission).toBe(false);
    expect(result.machine.status).toBe("BLOCKED");
  });

  it("never produces a directional trading decision", () => {
    const result = evaluateF1StateEngine({
      environmentalStress: 0.30,
      structuralIntegrity: 0.80,
      tireDecay: 0.20,
      performanceCapacity: 0.80,
      temporalPressure: 0.20,
      deploymentCapacity: 0.80,
      cavitationScore: 0.20,
      structuralCoherence: 0.80,
    });

    expect(result).not.toHaveProperty("direction");
    expect(result).not.toHaveProperty("side");
    expect(result).not.toHaveProperty("signal");
  });
});
