/**
 * G5 — EXAMINATION (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates tick rate / velocity (tachometer). Applies mathematical
 * friction when the market is stalled or trapped in compressed chop.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g5Examination: Gate = ({ ppg }): GateOutcome => {
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  const velocityValue = ppg?.velocity?.value ?? 0;

  // 1. Base Score (Tachometer reading)
  // If velocity is 0, base score is 0. The market must prove it has momentum.
  const baseScore = clamp01(velocityValue / 0.01);

  // 2. Apply Structural Friction Penalties
  let frictionPenalty = 0;

  // Anti-Stall: If the engine is stalled (dead volume/ticks), apply heavy drag
  if (velocityValue < 0.002) {
    frictionPenalty += 0.4;
  }

  // If trapped in a compressed sideways wave, add drag
  if (waveState === "COMPRESSED") {
    frictionPenalty += 0.3;
  }

  // 3. Final Score Calculation (No artificial perfect scores)
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 4. Soft Veto Threshold
  const isHealthy = finalScore >= 0.3;

  return {
    gate: "G5_EXAMINATION",
    passed: isHealthy,     // Fails the gate if the market is stalled out
    score: finalScore,     // Passes the true, penalized score down the pipeline
    weight: 0.75,          // Retains original weight
    hardVeto: false,       // SOFT VETO: Never halts the pipeline instantly
    evidence: {
      waveState,
      tickRate: velocityValue,
      frictionPenalty
    },
    reason: isHealthy
      ? `tachometer active · score=${finalScore.toFixed(3)} · velocity=${velocityValue.toFixed(4)}`
      : `SOFT VETO: engine stalled/choppy · score=${finalScore.toFixed(3)} · velocity=${velocityValue.toFixed(4)}`,
    specified: true,
  };
};
