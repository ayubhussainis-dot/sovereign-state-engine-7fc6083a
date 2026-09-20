/**
 * G2 — STRUCTURE (MARKET REGIME GATE)
 *
 * Purpose:
 *   Evaluate whether the current market has sufficient structural
 *   activity for execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe
 *
 * Behavior:
 *   - Sufficient structural activity -> PASS
 *   - Insufficient activity / unknown structure -> FAIL + VETO
 *   - COMPRESSED is observed but is NOT automatically vetoed here.
 *     PPG remains responsible for describing the wave condition.
 *
 * Design principle:
 *   G2 answers:
 *     "Is there enough market structure to consider execution?"
 *
 *   It does NOT answer:
 *     "Should we buy or sell?"
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

const MIN_STRUCTURAL_SCORE = 0.60;

export const g2Structure: Gate = ({ twin }): GateOutcome => {
  const rollingVolume =
    (twin?.buyVolume ?? 0) +
    (twin?.sellVolume ?? 0);

  const waveState = twin?.wave ?? "UNKNOWN";

  const windowSize = twin?.window?.length ?? 0;

  /*
   * Structural activity score.
   *
   * This preserves the original deterministic volume model,
   * but unlike the previous implementation, the result now
   * has actual authority.
   */
  const baseScore = clamp01(
    rollingVolume / (rollingVolume + 5) + 0.3
  );

  /*
   * We require an actual observed market state.
   *
   * UNKNOWN means the engine does not have enough structural
   * information to safely authorize execution.
   */
  const hasValidStructure =
    waveState !== "UNKNOWN" &&
    windowSize > 0;

  const structurallySufficient =
    baseScore >= MIN_STRUCTURAL_SCORE &&
    hasValidStructure;

  /*
   * G2 now has execution authority.
   *
   * A structurally insufficient market cannot proceed.
   */
  const passed = structurallySufficient;

  const hardVeto = !structurallySufficient;

  return {
    gate: "G2_STRUCTURE",

    passed,

    score: baseScore,

    weight: 1.0,

    hardVeto,

    evidence: {
      rollingVolume,
      waveState,
      windowSize,
      minimumScore: MIN_STRUCTURAL_SCORE,
      structurallySufficient,
    },

    reason: structurallySufficient
      ? `structure sufficient · volume=${rollingVolume.toFixed(
          2
        )} · wave=${waveState} · score=${baseScore.toFixed(2)}`
      : `structure insufficient · volume=${rollingVolume.toFixed(
          2
        )} · wave=${waveState} · score=${baseScore.toFixed(
          2
        )} · EXECUTION VETO`,

    specified: true,
  };
};
