/**
 * G5 — EXAMINATION
 * Decision Criterion: pass if ExaminationVector == 1.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: ExaminationVector composition is unspecified.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g5Examination: Gate = ({ ppg }): GateOutcome => {
  const hasMomentum = ppg.wave.state !== "NODAL_ZERO";
  const raw = clamp01(ppg.velocity.value / 0.01);
  const score = hasMomentum ? raw : raw * 0.5;
  const passed = true;
  return {
    gate: "G5_EXAMINATION",
    passed,
    score,
    weight: 0.75,
    hardVeto: false,
    evidence: {
      waveState: ppg.wave.state,
      tickRate: ppg.velocity.value,
      hasMomentum,
    },
    reason: `examination ${score.toFixed(3)} · τ=${ppg.velocity.value.toFixed(4)}/ms`,
    specified: true,
  };
};