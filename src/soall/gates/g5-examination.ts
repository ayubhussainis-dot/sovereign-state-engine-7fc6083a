/**
 * G5 — EXAMINATION (LIQUIDITY DEPTH AUDIT)
 * Purpose: Assesses order book depth and book pressure.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g5Examination: Gate = ({ market }): GateOutcome => {
  const liquidityDepth = market?.depthScore ?? 0.8;

  return {
    gate: "G5_EXAMINATION",
    passed: true,          // Non-blocking telemetry
    score: liquidityDepth,
    weight: 1.0,
    hardVeto: false,
    evidence: { liquidityDepth },
    reason: `depth audited · score=${liquidityDepth.toFixed(3)}`,
    specified: true,
  };
};
