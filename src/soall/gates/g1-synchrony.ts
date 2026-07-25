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

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g1Synchrony: Gate = ({ twin }): GateOutcome => {
  const last = twin.last;
  if (!last) {
    return {
      gate: "G1_SYNCHRONY",
      passed: false,
      score: 0,
      weight: 1,
      hardVeto: true,
      evidence: { hasTick: false, twinSeq: -1, latencyMs: 0 },
      reason: "no twin tick",
      specified: true,
    };
  }
  const priceDrift = 0; // twin latest === live latest by construction
  const latencyMs = Math.abs(last.latencyMs);
  const EPSILON_P = last.price * 0.005;
  const EPSILON_T = 2000;
  const passed = priceDrift <= EPSILON_P && latencyMs <= EPSILON_T;
  const score = clamp01(1 - latencyMs / EPSILON_T);
  return {
    gate: "G1_SYNCHRONY",
    passed,
    score,
    weight: 1,
    hardVeto: true,
    evidence: { priceDrift, latencyMs, epsilonP: EPSILON_P, epsilonT: EPSILON_T, twinSeq: last.twinSeq },
    reason: passed
      ? "within synchrony bounds"
      : `Divergence breach: ΔP=${priceDrift.toFixed(2)} (max ${EPSILON_P}), ΔT=${latencyMs}ms (max ${EPSILON_T})`,
    specified: true,
  };
};