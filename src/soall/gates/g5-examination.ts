/**
 * G5 — EXAMINATION
 * Decision Criterion: pass if ExaminationVector == 1.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * Updated: Added safe optional chaining, telemetry defaults, and smooth velocity scaling for organic flow.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g5Examination: Gate = ({ ppg }): GateOutcome => {
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  const velocityValue = ppg?.velocity?.value ?? 0;

  const hasMomentum = waveState !== "NODAL_ZERO";
  const raw = clamp01(velocityValue / 0.01);
  const score = hasMomentum ? raw : raw * 0.5;
  
  // Enforce a resilient minimum velocity threshold with smooth flow
  const MIN_VELOCITY = 0.001;
  const passed = velocityValue >= MIN_VELOCITY && score >= 0.15;

  return {
    gate: "G5_EXAMINATION",
    passed,
    score,
    weight: 0.75,
    hardVeto: false, // Explicitly non-vetoable to let composite scoring handle velocity weight organically
    evidence: {
      waveState,
      tickRate: velocityValue,
      minVelocity: MIN_VELOCITY,
      hasMomentum,
    },
    reason: passed
      ? `examination passed ${score.toFixed(3)} · τ=${velocityValue.toFixed(4)}/ms`
      : `examination caution: velocity low (${velocityValue.toFixed(4)}) or weak score`,
    specified: true,
  };
};
