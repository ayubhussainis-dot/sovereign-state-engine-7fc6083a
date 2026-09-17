/**
 * G5 — EXAMINATION (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Pure tachometer telemetry observer. Zero blocking, zero friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g5Examination: Gate = ({ ppg }): GateOutcome => {
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  const velocityValue = ppg?.velocity?.value ?? 0;

  const raw = clamp01(velocityValue / 0.01);
  const score = raw > 0 ? raw : 1.0; // Maintain full glide across all velocity states

  return {
    gate: "G5_EXAMINATION",
    passed: true,          // Absolute pass-through: tachometer reads velocity, never restricts
    score,
    weight: 0.75,
    hardVeto: false,       // Zero veto power, zero resistance
    evidence: {
      waveState,
      tickRate: velocityValue,
    },
    reason: `tachometer flowing freely · score=${score.toFixed(3)} · velocity=${velocityValue.toFixed(4)}/ms · wave=${waveState}`,
    specified: true,
  };
};
