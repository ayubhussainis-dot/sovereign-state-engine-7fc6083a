/**
 * G1 — SYNCHRONY
 *
 * Validates live-twin synchronization.
 * Synchronization loss is a true execution veto.
 */

import type { Gate, GateOutcome } from "../types";

export const g1Synchrony: Gate = ({ twin }): GateOutcome => {
  const last = twin?.last;

  const latencyMs = last
    ? Math.abs(last.latencyMs)
    : Number.POSITIVE_INFINITY;

  const isClockSynchronized = latencyMs <= 35.0;

  const finalScore = isClockSynchronized
    ? 1.0
    : Math.max(0, 1.0 - latencyMs / 100.0);

  return {
    gate: "G1_SYNCHRONY",
    passed: isClockSynchronized,
    score: finalScore,
    weight: 1.0,
    hardVeto: !isClockSynchronized,

    evidence: {
      hasTick: !!last,
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : -1,
      twinSeq: last?.twinSeq ?? -1,
      clock100HzActive: isClockSynchronized,
    },

    reason: isClockSynchronized
      ? `Clock synchronized · latency=${latencyMs.toFixed(2)}ms · score=${finalScore.toFixed(3)}`
      : `Clock UNSYNCHRONIZED · latency=${
          Number.isFinite(latencyMs) ? latencyMs.toFixed(2) : "NO_TICK"
        }ms · EXECUTION VETO`,

    specified: true,
  };
};
