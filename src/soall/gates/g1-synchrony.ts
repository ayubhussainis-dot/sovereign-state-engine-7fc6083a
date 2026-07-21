/**
 * G1 — SYNCHRONY
 * Purpose: validate feed freshness and twin↔external synchronization.
 * Decision Criterion: pass if ΔP ≤ ε_p and ΔT ≤ ε_t.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 *
 * NOTE: The synchrony math (ε_p, ε_t bounds) is unspecified. Until
 * provided we report structural evidence and mark `specified: false`.
 */

import type { Gate, GateOutcome } from "../types";

export const g1Synchrony: Gate = ({ twin }): GateOutcome => {
  const last = twin.last;
  return {
    gate: "G1_SYNCHRONY",
    passed: last !== null,
    evidence: {
      hasTick: last !== null,
      twinSeq: last?.twinSeq ?? -1,
      latencyMs: last?.latencyMs ?? 0,
    },
    reason: last ? "structural gate — math unspecified" : "no twin tick",
    specified: false,
  };
};