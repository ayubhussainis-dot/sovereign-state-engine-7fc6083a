/**
 * G5 — EXAMINATION
 * Decision Criterion: pass if ExaminationVector == 1.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g5Examination: Gate = ({ ppg }): GateOutcome => {
  const hasMomentum = ppg.wave.state !== "NODAL_ZERO";
  const raw = clamp01(ppg.velocity.value / 0.01);
  const score = hasMomentum ? raw : raw * 0.5;
  
  // Enforce a minimum velocity threshold so we don't trade on dead/flat ticks
  const MIN_VELOCITY = 0.001;
  const passed = ppg.velocity.value >= MIN_VELOCITY && score >= 0.20;

  return {
    gate: "G5_EXAMINATION",
    passed,
    score,
    weight: 0.75,
    hardVeto: false,
    evidence: {
      waveState: ppg.wave.state,
      tickRate: ppg.velocity.value,
      minVelocity: MIN_VELOCITY,
      hasMomentum,
    },
    reason: passed
      ? `examination passed ${score.toFixed(3)} · τ=${ppg.velocity.value.toFixed(4)}/ms`
      : `examination failed: velocity too low (${ppg.velocity.value.toFixed(4)}) or weak score`,
    specified: true,
  };
};
