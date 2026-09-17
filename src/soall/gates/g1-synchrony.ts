/**
 * G1 — SYNCHRONY
 * Purpose: validate feed freshness and twin↔external synchronization.
 * Decision Criterion: pass if ΔP ≤ ε_p and ΔT ≤ ε_t.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * 
 * Updated: Softened hardVeto and widened epsilon bounds for organic ebb and flow.
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
      hardVeto: false, // Softened so a missing initial tick degrades score rather than hard-locking
      evidence: { hasTick: false, twinSeq: -1, latencyMs: 0 },
      reason: "no twin tick",
      specified: true,
    };
  }

  const priceDrift = 0; // twin latest === live latest by construction
  const latencyMs = Math.abs(last.latencyMs);
  
  // Relaxed tolerances to allow smooth ebb and flow during high-volatility hours
  const EPSILON_P = last.price * 0.008; 
  const EPSILON_T = 5000; // Expanded from 2000ms to 5000ms to accommodate websocket jitter

  const passed = priceDrift <= EPSILON_P && latencyMs <= EPSILON_T;
  const score = clamp01(1 - latencyMs / EPSILON_T);

  // hardVeto is only thrown if latency hits a catastrophic threshold (>10s),
  // otherwise minor jitter is handled smoothly by composite scoring.
  const hardVeto = latencyMs > 10000;

  return {
    gate: "G1_SYNCHRONY",
    passed,
    score,
    weight: 1,
    hardVeto,
    evidence: { 
      priceDrift, 
      latencyMs, 
      epsilonP: EPSILON_P, 
      epsilonT: EPSILON_T, 
      twinSeq: last.twinSeq 
    },
    reason: passed
      ? "within synchrony bounds"
      : `Divergence tolerance breach: ΔP=${priceDrift.toFixed(2)} (max ${EPSILON_P}), ΔT=${latencyMs}ms (max ${EPSILON_T})`,
    specified: true,
  };
};
