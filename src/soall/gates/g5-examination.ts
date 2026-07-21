/**
 * G5 — EXAMINATION
 * Decision Criterion: pass if ExaminationVector == 1.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: ExaminationVector composition is unspecified.
 */

import type { Gate, GateOutcome } from "../types";

export const g5Examination: Gate = ({ ppg }): GateOutcome => {
  const hasMomentum = ppg.wave.state !== "NODAL_ZERO";
  const passed = hasMomentum && ppg.velocity.value > 0;
  return {
    gate: "G5_EXAMINATION",
    passed,
    evidence: {
      waveState: ppg.wave.state,
      tickRate: ppg.velocity.value,
      hasMomentum,
    },
    reason: passed
      ? "examination vector confirmed"
      : "Examination halted: Wave state is Nodal Zero or tick velocity is zero",
    specified: true,
  };
};