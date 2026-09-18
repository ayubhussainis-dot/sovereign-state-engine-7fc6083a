/**
 * G8 — AUTHORITY (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates system health and prior gate passes. Applies massive 
 * mathematical friction if required systems failed or health is degraded.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateId, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

const REQUIRED: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G3_CONFLUENCE",
  "G4_PATTERN",
  "G5_EXAMINATION",
  "G6_CONFIDENCE",
  "G7_RISK"
];

export const g8Authority: Gate = ({ priorPasses, risk }): GateOutcome => {
  const passes = priorPasses ?? [];
  const systemHealth = risk?.systemHealth ?? "NORMAL";

  // 1. Identify which mandatory gates failed their soft thresholds
  const missingGates = REQUIRED.filter((id) => !passes.includes(id));

  // 2. Base Authority Score
  const baseScore = 1.0;
  let frictionPenalty = 0;

  // 3. Apply the Pit Wall Friction Penalties
  if (missingGates.length > 0) {
    // Apply heavy drag for every critical subsystem that failed
    frictionPenalty += missingGates.length * 0.25;
  }

  if (systemHealth !== "NORMAL") {
    // Massive drag if the core engine health is compromised
    frictionPenalty += 0.5;
  }

  // 4. Final Score Calculation
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 5. Soft Veto Threshold
  // Requires a clean sweep (no missing gates, normal health) to pass clean
  const isHealthy = missingGates.length === 0 && systemHealth === "NORMAL";

  return {
    gate: "G8_AUTHORITY",
    passed: isHealthy,     // Fails if any required gate missed or health is bad
    score: finalScore,     // Passes the penalized score to the final composite calculation
    weight: 1.0,           // Equal weight 
    hardVeto: false,       // SOFT VETO: Never halts the pipeline instantly
    evidence: {
      authorityToken: isHealthy ? 1 : 0,
      systemHealth,
      totalPriorPasses: passes.length,
      missingRequiredGates: missingGates,
      frictionPenalty
    },
    reason: isHealthy
      ? `pit wall green flag · all systems nominal · score=${finalScore.toFixed(2)}`
      : `SOFT VETO: pit wall red flag · missing=${missingGates.length} · health=${systemHealth} · score=${finalScore.toFixed(2)}`,
    specified: true,
  };
};
