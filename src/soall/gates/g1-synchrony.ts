/**
 * G1 — SYNCHRONY & BREAKOUT TRAP GATE
 *
 * Dual-Authority Protection Layer:
 * 1. Physical Network Check: Validates live-twin synchronization latency.
 * 2. Asymmetric Breakout Trap: Forces the application to stand flat during
 *    the initial 1-bps buffer zone, entering only at the trough.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 * 
 * Locked Execution Bounds:
 *   - Entry Buffer: 1.0 bps
 *   - Base Size: 0.001
 *   - Target Win (TP): +30 bps
 *   - Target Loss (SL): -30 bps
 */

import type { Gate, GateOutcome } from "../types";

const SYNCHRONIZED_LATENCY_MS = 35.0;
const MAX_EXECUTION_LATENCY_MS = 100.0;
const TRAP_BUFFER_BPS = 1.0; // Locked to the 1 BPS starting buffer

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export const g1Synchrony: Gate = ({
  twin,
  risk,
}): GateOutcome => {
  const last = twin?.last;
  const latencyMs = last ? Math.abs(last.latencyMs) : Number.POSITIVE_INFINITY;
  const hasTick = !!last;

  // --- PHASE 1: PHYSICAL NETWORK LATENCY AUDIT ---
  const isClockSynchronized =
    hasTick &&
    Number.isFinite(latencyMs) &&
    latencyMs <= SYNCHRONIZED_LATENCY_MS;

  const executionSafe =
    hasTick &&
    Number.isFinite(latencyMs) &&
    latencyMs <= MAX_EXECUTION_LATENCY_MS;

  // Primary network latency readiness state
  const physicalNetworkPassed = hasTick ? executionSafe : true;

  const finalScore = Number.isFinite(latencyMs)
    ? clamp01(1 - latencyMs / MAX_EXECUTION_LATENCY_MS)
    : 1.0;

  // If the underlying internet connection is broken/degraded, fail immediately via latency veto
  if (!physicalNetworkPassed) {
    return {
      gate: "G1_SYNCHRONY",
      passed: false,
      score: finalScore,
      weight: 1.0,
      hardVeto: true, // Safety veto blocks execution
      evidence: {
        hasTick,
        latencyMs: Number.isFinite(latencyMs) ? latencyMs : -1,
        isClockSynchronized,
        executionSafe,
        twinSeq: last?.twinSeq ?? -1,
        trapState: risk?.positionState ?? "UNKNOWN",
        currentDriftBps: 0,
        targetSize: 0.001,
        targetWinBps: 30.0,
        targetLossBps: -30.0
      },
      reason: `Clock UNSYNCHRONIZED · latency=${latencyMs.toFixed(2)}ms · Network execution blocked.`,
      specified: true
    };
  }

  // --- PHASE 2: ASYMMETRIC LIQUIDITY TRAP GATEWAY ---
  let strategyPassed = true;
  let strategicReason = "";
  let currentDriftBps = 0;

  // Check if your worker has a registered position state layout available
  if (risk && risk.positionState === "TRAPPING" && risk.signalPrice > 0) {
    const side = risk.positionSide;
    const currentPrice = last ? parseFloat(last.close || last.price || currentPrice) : risk.signalPrice;
    
    // Long Trap: We want the price to go DOWN (negative bps from signal mark)
    // Short Trap: We want the price to go UP (positive bps from signal mark)
    const multiplier = side === "long" ? -1 : 1;
    currentDriftBps = ((currentPrice - risk.signalPrice) / risk.signalPrice) * multiplier * 10000;

    // G1 only unlocks if the price flushes exactly 1 bps or deeper against the trend signal
    strategyPassed = currentDriftBps >= TRAP_BUFFER_BPS;
    
    strategicReason = strategyPassed
      ? `TRAP_SPRUNG · Market flushed ${currentDriftBps.toFixed(2)}bps · Entry Authorized.`
      : `DETACHED_MONITORING · Drift tracking active · Drift: ${currentDriftBps.toFixed(2)}bps / Target: ${TRAP_BUFFER_BPS}bps.`;
  } else if (risk && risk.positionState === "FLAT") {
    strategicReason = "FLAT_STATE · Standby pattern active · Awaiting consensus initialization.";
  } else {
    strategicReason = "POSITION_OPEN · Surfing mechanics live · Processing active loop boundaries.";
  }

  // G1 fully passes ONLY if the network is perfectly safe AND the 1 bps trap has cleanly sprung
  const finalPassedState = physicalNetworkPassed && strategyPassed;

  return {
    gate: "G1_SYNCHRONY",

    passed: finalPassedState,

    score: isClockSynchronized && strategyPassed ? 1.0 : finalScore * (strategyPassed ? 1.0 : 0.0),

    weight: 1.0,

    // IMPORTANT: Flips G1 to a strict authority veto to isolate your cash during the drift phase
    hardVeto: !strategyPassed || !isClockSynchronized,

    evidence: {
      hasTick,
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : -1,
      isClockSynchronized,
      executionSafe,
      synchronizedThresholdMs: SYNCHRONIZED_LATENCY_MS,
      maxExecutionLatencyMs: MAX_EXECUTION_LATENCY_MS,
      twinSeq: last?.twinSeq ?? -1,
      clock100HzActive: isClockSynchronized,
      
      // Extended quantitative trap telemetry for your audit ledger
      trapState: risk?.positionState ?? "FLAT",
      currentDriftBps: parseFloat(currentDriftBps.toFixed(4)),
      trapBufferBps: TRAP_BUFFER_BPS,
      signalAnchorPrice: risk?.signalPrice ?? 0,

      // Deterministic execution bounds injected for downstream order router
      targetSize: 0.001,
      targetWinBps: 30.0,
      targetLossBps: -30.0
    },

    reason: !hasTick
      ? `Awaiting initial tick · connection pending`
      : !strategyPassed
        ? `STRATEGIC_VETO · ${strategicReason}`
        : `EXECUTION_CLEAR · Clock latency=${latencyMs.toFixed(2)}ms · ${strategicReason}`,

    specified: true,
  };
};
