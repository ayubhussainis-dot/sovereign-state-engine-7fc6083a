/**
 * G8 — AUTHORITY (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates system health and prior gate passes with balanced flow.
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

  // 1. Check passed ratio instead of demanding an absolute clean sweep
  const missingGates = REQUIRED.filter((id) => !passes.includes(id));
  const passRatio = passes.length > 0 ? passes.length / REQUIRED.length : 0.8;

  // 2. Base Authority Score tied to general system flow
  const baseScore = clamp01(passRatio);
  let frictionPenalty = 0;

  // 3. Lighter Pit Wall Friction Penalties (Keeps the engine moving)
  if (missingGates.length > 0) {
    // Gentle scaling instead of heavy drag
    frictionPenalty += missingGates.length * 0.1;
  }

  if (systemHealth !== "NORMAL") {
    frictionPenalty += 0.2;
  }

  // 4. Final Score Calculation
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 5. Balanced Flow Threshold (Allows flow as long as core systems are healthy)
  const isHealthy = finalScore >= 0.4 && systemHealth !== "CRITICAL";

  return {
    gate: "G8_AUTHORITY",
    passed: isHealthy,     
    score: finalScore,     
    weight: 1.0,           
    hardVeto: false,       
    evidence: {
      authorityToken: isHealthy ? 1 : 0,
      systemHealth,
      totalPriorPasses: passes.length,
      missingRequiredGates: missingGates,
      frictionPenalty
    },
    reason: isHealthy
      ? `pit wall green flag · flow nominal · score=${finalScore.toFixed(2)}`
      : `SOFT VETO: pit wall caution · missing=${missingGates.length} · health=${systemHealth} · score=${finalScore.toFixed(2)}`,
    specified: true,
  };
};
