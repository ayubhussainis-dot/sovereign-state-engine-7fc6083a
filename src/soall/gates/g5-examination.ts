/**
 * G5 — EXAMINATION (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Measure momentum and velocity without blocking the track during slow patches.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g5Examination: Gate = ({ ppg }): GateOutcome => {
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  const velocityValue = ppg?.velocity?.value ?? 0;

  const hasMomentum = waveState !== "NODAL_ZERO";
  const raw = clamp01(velocityValue / 0.01);
  const score = hasMomentum ? raw : raw * 0.5;

  return {
    gate: "G5_EXAMINATION",
    passed: true, // Unblocked spectator mode: velocity grades the tachometer, never blocks the run
    score,
    weight: 0.75,
    hardVeto: false, // Zero friction, zero resistance
    evidence: {
      waveState,
      tickRate: velocityValue,
      hasMomentum,
    },
    reason: `tachometer flowing smoothly · score=${score.toFixed(3)} · velocity=${velocityValue.toFixed(4)}/ms · wave=${waveState}`,
    specified: true,
  };
};
