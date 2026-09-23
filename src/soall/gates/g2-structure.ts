/**
 * G2 — STRUCTURE (MARKET REGIME & MOMENTUM VELOCITY GATE)
 *
 * Purpose:
 *   Evaluate whether the current market has sufficient structural
 *   activity and velocity momentum for confirmed trend execution.
 *
 * TEST STRATEGY:
 *   - Momentum activation begins at +1 BPS
 *   - Winning boundary: +30 BPS
 *   - Loss boundary: -30 BPS
 *   - Same PnL model for long and short positions
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe
 *
 * Behavior:
 *   - Sufficient structural activity -> PASS
 *   - >= +1 BPS favorable movement while live -> velocity confirmed
 *   - +30 BPS -> strategic target boundary
 *   - -30 BPS -> strategic loss boundary
 *   - G2 remains a quality gate, not an execution veto.
 */

import type { Gate, GateOutcome } from "../types";

// =====================================================================
// NORMALIZATION
// =====================================================================

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

// =====================================================================
// STRUCTURAL PARAMETERS
// =====================================================================

const MIN_STRUCTURAL_SCORE = 0.60;

/**
 * Momentum activation starts at +1 BPS.
 *
 * This replaces the previous 12 BPS tipping point.
 */
const MOMENTUM_START_BPS = 1.0;

/**
 * Strategic winning boundary.
 */
const TARGET_WIN_BPS = 30.0;

/**
 * Strategic maximum-loss boundary.
 */
const MAX_LOSS_BPS = -30.0;

// =====================================================================
// G2 STRUCTURE
// =====================================================================

export const g2Structure: Gate = ({
  twin,
  risk,
}): GateOutcome => {

  // -------------------------------------------------------------------
  // MARKET STRUCTURE
  // -------------------------------------------------------------------

  const rollingVolume =
    (twin?.buyVolume ?? 0) +
    (twin?.sellVolume ?? 0);

  const waveState =
    twin?.wave ?? "UNKNOWN";

  const windowSize =
    twin?.window?.length ?? 0;

  // -------------------------------------------------------------------
  // BASE STRUCTURAL SCORE
  // -------------------------------------------------------------------

  let baseScore = clamp01(
    rollingVolume /
      (rollingVolume + 5) +
      0.3
  );

  // -------------------------------------------------------------------
  // LIVE POSITION VELOCITY
  // -------------------------------------------------------------------

  let velocityStartCleared = false;

  let currentPnLBps = 0;

  let targetReached = false;

  let lossBoundaryReached = false;

  const positionIsLive =
    risk &&
    (
      risk.positionState === "OPEN" ||
      risk.positionState === "MANAGING" ||
      risk.positionState === "HOLDING_STRETCH"
    );

  if (positionIsLive) {

    const lastPrice =
      twin?.last
        ? parseFloat(
            twin.last.close ||
            twin.last.price ||
            risk.currentPrice
          )
        : risk.currentPrice;

    const multiplier =
      risk.positionSide === "long"
        ? 1
        : -1;

    // ---------------------------------------------------------------
    // Unified long/short PnL calculation.
    //
    // Long:
    //   price rises  -> positive BPS
    //   price falls  -> negative BPS
    //
    // Short:
    //   price falls  -> positive BPS
    //   price rises  -> negative BPS
    // ---------------------------------------------------------------

    if (
      risk.entryPrice &&
      Number.isFinite(risk.entryPrice) &&
      risk.entryPrice !== 0
    ) {
      currentPnLBps =
        (
          ((lastPrice - risk.entryPrice) /
            risk.entryPrice) *
          multiplier *
          10000
        );
    }

    // ---------------------------------------------------------------
    // +1 BPS MOMENTUM ACTIVATION
    // ---------------------------------------------------------------

    if (
      currentPnLBps >=
      MOMENTUM_START_BPS
    ) {
      velocityStartCleared = true;

      /*
       * Once the position has moved at least +1 BPS
       * in its favorable direction, G2 recognizes
       * confirmed positive velocity.
       */
      baseScore = 1.0;
    }

    // ---------------------------------------------------------------
    // +30 BPS WIN BOUNDARY
    // ---------------------------------------------------------------

    if (
      currentPnLBps >=
      TARGET_WIN_BPS
    ) {
      targetReached = true;
    }

    // ---------------------------------------------------------------
    // -30 BPS LOSS BOUNDARY
    // ---------------------------------------------------------------

    if (
      currentPnLBps <=
      MAX_LOSS_BPS
    ) {
      lossBoundaryReached = true;
    }
  }

  // ===================================================================
  // STRUCTURAL VALIDATION
  // ===================================================================

  const hasValidStructure =
    waveState !== "UNKNOWN" &&
    windowSize > 0;

  const structurallySufficient =
    baseScore >=
      MIN_STRUCTURAL_SCORE &&
    hasValidStructure;

  /*
   * G2 passes if:
   *
   *   1. normal structural conditions are sufficient
   *
   * OR
   *
   *   2. favorable velocity has started at +1 BPS.
   *
   * The +30 / -30 boundaries are informational here.
   * Actual execution/settlement remains the responsibility
   * of the execution engine and G8 authority layer.
   */
  const passed =
    structurallySufficient ||
    velocityStartCleared;

  /*
   * G2 is informational/quality authority.
   *
   * It does NOT independently block execution.
   */
  const hardVeto = false;

  // ===================================================================
  // QUANTITATIVE REASON
  // ===================================================================

  let quantitativeReason = "";

  if (lossBoundaryReached) {

    quantitativeReason =
      `LOSS_BOUNDARY_REACHED · ` +
      `PnL: ${currentPnLBps.toFixed(2)}bps <= ` +
      `${MAX_LOSS_BPS}bps · ` +
      `Execution boundary: -30 BPS`;

  } else if (targetReached) {

    quantitativeReason =
      `TARGET_BOUNDARY_REACHED · ` +
      `PnL: ${currentPnLBps.toFixed(2)}bps >= ` +
      `+${TARGET_WIN_BPS}bps · ` +
      `Execution boundary: +30 BPS`;

  } else if (velocityStartCleared) {

    quantitativeReason =
      `MOMENTUM_STARTED · ` +
      `PnL: ${currentPnLBps.toFixed(2)}bps >= ` +
      `${MOMENTUM_START_BPS}bps · ` +
      `Velocity active from +1 BPS · ` +
      `Score maxed`;

  } else {

    quantitativeReason =
      `volume=${rollingVolume.toFixed(2)} · ` +
      `wave=${waveState} · ` +
      `score=${baseScore.toFixed(2)} · ` +
      `PnL=${currentPnLBps.toFixed(2)}bps`;
  }

  // ===================================================================
  // FINAL GATE OUTCOME
  // ===================================================================

  return {
    gate: "G2_STRUCTURE",

    passed,

    score: baseScore,

    weight: 1.0,

    hardVeto,

    evidence: {

      // ---------------------------------------------------------------
      // MARKET STRUCTURE
      // ---------------------------------------------------------------

      rollingVolume,

      waveState,

      windowSize,

      minimumScore:
        MIN_STRUCTURAL_SCORE,

      structurallySufficient,

      // ---------------------------------------------------------------
      // UNIFIED BPS MODEL
      // ---------------------------------------------------------------

      currentPnLBps:
        parseFloat(
          currentPnLBps.toFixed(2)
        ),

      momentumStartBps:
        MOMENTUM_START_BPS,

      targetWinBps:
        TARGET_WIN_BPS,

      maximumLossBps:
        MAX_LOSS_BPS,

      // ---------------------------------------------------------------
      // VELOCITY
      // ---------------------------------------------------------------

      velocityStartCleared,

      // ---------------------------------------------------------------
      // STRATEGIC BOUNDARIES
      // ---------------------------------------------------------------

      targetReached,

      lossBoundaryReached,

      // ---------------------------------------------------------------
      // POSITION
      // ---------------------------------------------------------------

      positionState:
        risk?.positionState ??
        "FLAT",

      positionSide:
        risk?.positionSide ??
        null,

      entryPrice:
        risk?.entryPrice ??
        null,

      currentPrice:
        risk?.currentPrice ??
        null,
    },

    reason: passed
      ? `Structure sufficient · ${quantitativeReason}`
      : `Structure insufficient · ${quantitativeReason} · QUALITY FAIL`,

    specified: true,
  };
};
