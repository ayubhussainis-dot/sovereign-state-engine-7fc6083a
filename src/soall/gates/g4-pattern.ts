/**
 * G4 — PATTERN (DYNAMIC TRACTION CONTROL / SOFT VETO)
 * Purpose: Evaluates track surface (volatility, spread, and wave state). Applies
 * mathematical friction when market noise, spread, or compressed chop occurs.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g4Pattern: Gate = ({ ppg, twin }): GateOutcome => {
  const volatilityValue = ppg?.volatility?.value ?? 0.01;
  const spreadValue = ppg?.spread?.value ?? 0.5;
  const waveState = ppg?.wave?.state ?? twin?.wave ?? "UNKNOWN";

  // 1. Calculate Track Surface Friction / Grip
  const patternFriction = volatilityValue * 10 + (spreadValue / 1000);
  
  // 2. Base Score Calculation (True inverse of friction)
  const baseScore = clamp01(1 - patternFriction);

  // 3. Apply Structural Friction Penalties
  let frictionPenalty = 0;
  
  // Directly penalize compressed sideways chop
  if (waveState === "COMPRESSED") {
    frictionPenalty += 0.4;
  }
  
  // If spread is abnormally wide (illiquid/choppy), add drag
  if (spreadValue > 1.5) { 
    frictionPenalty += 0.2;
  }
  
  // If volatility is dangerously high (whipsaw territory), add drag
  if (volatilityValue > 0.05) { 
    frictionPenalty += 0.3;
  }

  // 4. Final Score Calculation
  const finalScore = clamp01(baseScore - frictionPenalty);

  // 5. Soft Veto Threshold
  const isHealthy = finalScore >= 0.3;

  return {
    gate: "G4_PATTERN",
    passed: isHealthy,     // Fails the gate if surface friction or chop is too high
    score: finalScore,     // Passes the true, penalized score down the pipeline
    weight: 1.0,           // Equal weight to pull down the composite if weak
    hardVeto: false,       // SOFT VETO: Never halts the pipeline instantly
    evidence: {
      volatility: volatilityValue,
      spread: spreadValue,
      waveState,
      patternFriction,
      frictionPenalty
    },
    reason: isHealthy
      ? `track grip stable · score=${finalScore.toFixed(3)} · friction=${patternFriction.toFixed(4)}`
      : `SOFT VETO: high friction/compressed wave · score=${finalScore.toFixed(3)} · wave=${waveState}`,
    specified: true,
  };
};
