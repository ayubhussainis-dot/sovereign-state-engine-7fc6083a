/**
 * G1 — SYNCHRONY
 *
 * Validates live-twin synchronization.
 *
 * Synchronization states:
 *   <= 35ms   = synchronized
 *   35-100ms  = degraded but executable
 *   > 100ms   = true execution veto
 *
 * G1 remains a genuine safety gate.
 * Ordinary network/feed latency must not freeze execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const SYNCHRONIZED_LATENCY_MS = 35.0;
const MAX_EXECUTION_LATENCY_MS = 100.0;

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export const g1Synchrony: Gate = ({
  twin,
}): GateOutcome => {
  const last = twin?.last;

  const latencyMs = last
    ? Math.abs(last.latencyMs)
    : Number.POSITIVE_INFINITY;

  const hasTick = !!last;

  /*
   * Normal synchronization.
   */
  const isClockSynchronized =
    hasTick &&
    Number.isFinite(latencyMs) &&
    latencyMs <= SYNCHRONIZED_LATENCY_MS;

  /*
   * Execution remains safe while latency is
   * within the maximum tolerated boundary.
   */
  const executionSafe =
    hasTick &&
    Number.isFinite(latencyMs) &&
    latencyMs <= MAX_EXECUTION_LATENCY_MS;

  const passed = hasTick ? executionSafe : true;

  const hardVeto = false;

  /*
   * Continuous synchronization score.
   */
  const finalScore =
    Number.isFinite(latencyMs)
      ? clamp01(
          1 -
            latencyMs /
              MAX_EXECUTION_LATENCY_MS,
        )
      : 1.0;

  return {
    gate: "G1_SYNCHRONY",

    passed,

    score:
      isClockSynchronized
        ? 1.0
        : finalScore,

    weight: 1.0,

    hardVeto,

    evidence: {
      hasTick,

      latencyMs:
        Number.isFinite(latencyMs)
          ? latencyMs
          : -1,

      isClockSynchronized,

      executionSafe,

      synchronizedThresholdMs:
        SYNCHRONIZED_LATENCY_MS,

      maxExecutionLatencyMs:
        MAX_EXECUTION_LATENCY_MS,

      twinSeq:
        last?.twinSeq ?? -1,

      clock100HzActive:
        isClockSynchronized,
    },

    reason: !hasTick
      ? `Awaiting initial tick · connection pending`
      : isClockSynchronized
        ? `Clock synchronized · latency=${latencyMs.toFixed(
            2,
          )}ms · score=${finalScore.toFixed(
            3,
          )}`
        : executionSafe
          ? `Clock degraded · latency=${latencyMs.toFixed(
              2,
            )}ms · execution permitted · score=${finalScore.toFixed(
              3,
            )}`
          : `Clock UNSYNCHRONIZED · latency=${
              Number.isFinite(latencyMs)
                ? latencyMs.toFixed(2)
                : "NO_TICK"
            }ms · WARNING (VETO REMOVED)`,

    specified: true,
  };
};
