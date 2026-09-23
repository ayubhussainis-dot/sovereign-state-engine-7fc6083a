/**
 * G2 — STRUCTURE (MARKET REGIME & MOMENTUM VELOCITY GATE)
 *
 * Purpose:
 *   Evaluate whether the current market has sufficient structural
 *   activity and velocity momentum for confirmed trend execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe
 *
 * Behavior:
 *   - Sufficient structural activity or >= 12 bps velocity -> PASS
 *   - Insufficient activity / flat structure -> FAIL
 *   - G2 remains a quality gate, not a hard execution veto.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

const MIN_STRUCTURAL_SCORE = 0.60;
const TIPPING_POINT_BPS = 12.0; // The momentum velocity tipping point

export const g2Structure: Gate = ({ twin, risk }): GateOutcome => {
  const rollingVolume =
    (twin?.buyVolume ?? 0) +
    (twin?.sellVolume ?? 0);

  const waveState = twin?.wave ?? "UNKNOWN";

  const windowSize =
    twin?.window?.length ?? 0;

  // Primary volume-depth activity score calculation
  let baseScore = clamp01(
    rollingVolume / (rollingVolume + 5) + 0.3
  );

  // --- SOVEREIGN VELOCITY MODIFIER ---
  // If the trade is live and has cleared the 12 bps point of no return, maximize the structure score
  let velocityTippingPointCleared = false;
  let currentPnLBps = 0;

  if (risk && (risk.positionState === "OPEN" || risk.positionState === "MANAGING" || risk.positionState === "HOLDING_STRETCH")) {
    const lastPrice = twin?.last ? parseFloat(twin.last.close || twin.last.price || risk.currentPrice) : risk.currentPrice;
    const multiplier = risk.positionSide === "long" ? 1 : -1;
    currentPnLBps = ((lastPrice - risk.entryPrice) / risk.entryPrice) * multiplier * 10000;

    if (currentPnLBps >= TIPPING_POINT_BPS) {
      velocityTippingPointCleared = true;
      baseScore = 1.0; // Overrides base score with maximum quality weight
    }
  }

  const hasValidStructure =
    waveState !== "UNKNOWN" &&
    windowSize > 0;

  const structurallySufficient =
    baseScore >= MIN_STRUCTURAL_SCORE &&
    hasValidStructure;

  // G2 passes if structure metrics are safe OR if sovereign velocity is confirmed
  const passed = structurallySufficient || velocityTippingPointCleared;

  /*
   * G2 is informational/quality authority.
   * Failure does not independently block execution.
   */
  const hardVeto = false;

  let quantitativeReason = "";
  if (velocityTippingPointCleared) {
    quantitativeReason = `SOVEREIGN MOMENTUM SECURED · PnL: ${currentPnLBps.toFixed(2)}bps >= ${TIPPING_POINT_BPS}bps tipping point · Score maxed.`;
  } else {
    quantitativeReason = `volume=${rollingVolume.toFixed(2)} · wave=${waveState} · score=${baseScore.toFixed(2)}`;
  }

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
      
      // Extended structural metrics for your audit ledger
      velocityTippingPointCleared,
      currentPnLBps: parseFloat(currentPnLBps.toFixed(2)),
      tippingPointThresholdBps: TIPPING_POINT_BPS,
      positionState: risk?.positionState ?? "FLAT"
    },

    reason: passed
      ? `Structure sufficient · ${quantitativeReason}`
      : `Structure insufficient · ${quantitativeReason} · QUALITY FAIL`,

    specified: true,
  };
};
