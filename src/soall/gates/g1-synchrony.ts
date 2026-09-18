/**
 * G1 — SYNCHRONY (100HZ POWERTRAIN CLOCK OBSERVER)
 * Purpose: Pure telemetry observer validating 100Hz loop synchronization. Non-blocking.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g1Synchrony: Gate = ({ twin, powertrainInput }): GateOutcome => {
  const last = twin?.last;
  const latencyMs = last ? Math.abs(last.latencyMs) : 0;
  
  const isClockSynchronized = latencyMs <= 35.0;
  const finalScore = isClockSynchronized ? 1.0 : Math.max(0, 1.0 - (latencyMs / 100.0));

  return {
    gate: "G1_SYNCHRONY",
    passed: true,          // Zero veto power: pure telemetry monitor
    score: finalScore,     
    weight: 1.0,
    hardVeto: false,       
    evidence: { 
      hasTick: !!last,
      latencyMs, 
      twinSeq: last?.twinSeq ?? -1,
      clock100HzActive: isClockSynchronized
    },
    reason: `100Hz clock monitored · latency=${latencyMs}ms · score=${finalScore.toFixed(3)}`,
    specified: true,
  };
};
