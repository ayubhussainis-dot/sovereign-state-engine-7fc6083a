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
 *   - Insufficient activity / unknown structure -> FAIL
 *   - G2 is a quality gate, not a hard execution veto.
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

  const windowSize =
    twin?.window?.length ?? 0;

  const baseScore = clamp01(
    rollingVolume / (rollingVolume + 5) + 0.3
  );

  const hasValidStructure =
    waveState !== "UNKNOWN" &&
    windowSize > 0;

  const structurallySufficient =
    baseScore >= MIN_STRUCTURAL_SCORE &&
    hasValidStructure;

  const passed =
    structurallySufficient;

  /*
   * G2 is informational/quality authority.
   * Failure does not independently block execution.
   */
  const hardVeto = false;

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
      minimumScore:
        MIN_STRUCTURAL_SCORE,
      structurallySufficient,
    },

    reason: structurallySufficient
      ? `structure sufficient · volume=${rollingVolume.toFixed(
          2
        )} · wave=${waveState} · score=${baseScore.toFixed(
          2
        )}`
      : `structure insufficient · volume=${rollingVolume.toFixed(
          2
        )} · wave=${waveState} · score=${baseScore.toFixed(
          2
        )} · QUALITY FAIL`,

    specified: true,
  };
};
