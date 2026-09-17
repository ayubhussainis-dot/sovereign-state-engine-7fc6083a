/**
 * G1 — SYNCHRONY (SKIER SPECTATOR PASS-THROUGH)
 * Purpose: Pure telemetry observer. Zero blocking, zero friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g1Synchrony: Gate = ({ twin }): GateOutcome => {
  const last = twin?.last;
  
  const latencyMs = last ? Math.abs(last.latencyMs) : 0;
  
  return {
    gate: "G1_SYNCHRONY",
    passed: true,          // Absolute pass-through: never block the skier
    score: 1.0,            // Full harmony score, zero drag
    weight: 1,
    hardVeto: false,       // Zero veto power
    evidence: { 
      hasTick: !!last,
      latencyMs, 
      twinSeq: last?.twinSeq ?? -1 
    },
    reason: `skier gliding freely · latency=${latencyMs}ms · zero resistance`,
    specified: true,
  };
};
