/**
 * G1 — SYNCHRONY (SKIER SPECTATOR PASS-THROUGH)
 * Purpose: Observe feed freshness and timing without blocking the skier.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g1Synchrony: Gate = ({ twin }): GateOutcome => {
  const last = twin?.last;
  
  if (!last) {
    return {
      gate: "G1_SYNCHRONY",
      passed: true, // Spectator is ready, never block initialization
      score: 0.5,
      weight: 1,
      hardVeto: false,
      evidence: { hasTick: false, twinSeq: -1, latencyMs: 0 },
      reason: "skier warming up on the deck · awaiting initial tick",
      specified: true,
    };
  }

  const latencyMs = Math.abs(last.latencyMs);
  
  // 5000ms baseline window to score the smoothness of the run
  const EPSILON_T = 5000; 
  const score = clamp01(1 - latencyMs / EPSILON_T);

  return {
    gate: "G1_SYNCHRONY",
    passed: true, // Pure observer mode: the skier flows freely down the mountain
    score,
    weight: 1,
    hardVeto: false, // Zero friction, zero resistance
    evidence: { 
      latencyMs, 
      epsilonT: EPSILON_T, 
      twinSeq: last.twinSeq 
    },
    reason: `skier run flowing smoothly · latency=${latencyMs}ms · form score=${score.toFixed(3)}`,
    specified: true,
  };
};
