/**
 * G1 — SYNCHRONY (100HZ POWERTRAIN CLOCK GATE)
 *
 * Purpose:
 *   Validate that the live twin is receiving ticks within the
 *   permitted synchronization window.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe
 *
 * Behavior:
 *   - Synchronized clock  -> gate passes
 *   - Synchronization loss -> gate fails and hard-vetoes execution
 *
 * Threshold:
 *   <= 35 ms = synchronized
 */

import type { Gate, GateOutcome } from "../types";

export const g1Synchrony: Gate = ({ twin, powertrainInput }): GateOutcome => {
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

    // G1 now has actual authority.
    passed: isClockSynchronized,

    score: finalScore,

    weight: 1.0,

    // Synchronization failure is an execution veto.
    hardVeto: !isClockSynchronized,

    evidence: {
      hasTick: !!last,
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : -1,
      twinSeq: last?.twinSeq ?? -1,
      clock100HzActive: isClockSynchronized,
    },

    reason: isClockSynchronized
      ? `100Hz clock synchronized · latency=${latencyMs.toFixed(2)}ms · score=${finalScore.toFixed(3)}`
      : `100Hz clock UNSYNCHRONIZED · latency=${
          Number.isFinite(latencyMs) ? latencyMs.toFixed(2) : "NO_TICK"
        }ms · EXECUTION VETO`,

    specified: true,
  };
};
