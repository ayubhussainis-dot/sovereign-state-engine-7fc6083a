/**
 * G6 — CONFIDENCE (MACRO ALPHA & TREND STABILITY GATE)
 *
 * Decision Criterion:
 *   Pass if C >= C_FLOOR or optimized by sovereign trend confirmations.
 *
 * TEST STRATEGY:
 *   - Momentum/confidence activation begins at +1 BPS
 *   - Winning boundary: +30 BPS
 *   - Loss boundary: -30 BPS
 *   - Same PnL model for long and short positions
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * Behavior:
 *   - Calculated confidence score meets baseline -> PASS
 *   - Favorable position movement reaches +1 BPS -> sovereign
 *     confidence confirmation
 *   - +30 BPS -> strategic target boundary
 *   - -30 BPS -> strategic loss boundary
 *   - G6 remains a quality gate, not a hard execution veto.
 */

import type { Gate, GateOutcome } from "../types";

// =====================================================================
// CONFIDENCE PARAMETERS
// =====================================================================

const K1 = 2.0;

const K2 = 1.0;

const C_FLOOR = 0.60;

/**
 * Sovereign confidence activation starts at +1 BPS.
 *
 * Previous value:
 *   12 BPS
 *
 * New test configuration:
 *   1 BPS
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
// NORMALIZATION
// =====================================================================

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

// =====================================================================
// G6 CONFIDENCE
// =====================================================================

export const g6Confidence: Gate = ({
  ppg,
  twin,
  risk,
}): GateOutcome => {

  const volatility =
    ppg?.volatility?.value ?? 0;

  const ofi =
    ppg?.ofi?.value ?? 0;

  // -------------------------------------------------------------------
  // EXISTING CONFIDENCE MATHEMATICS
  //
  // C = 1 - (K1 × volatility + K2 × |OFI| × 0.1)
  // -------------------------------------------------------------------

  const rawConfidence =
    1.0 -
    (
      K1 * volatility +
      K2 * Math.abs(ofi) * 0.1
    );

  let confidenceScore =
    clamp01(rawConfidence);

  // -------------------------------------------------------------------
  // SOVEREIGN CONFIDENCE MONITOR
  // -------------------------------------------------------------------

  let sovereignConfidenceSecured =
    false;

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
    // Unified long/short PnL calculation
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
    // +1 BPS CONFIDENCE ACTIVATION
    // ---------------------------------------------------------------

    if (
      currentPnLBps >=
      MOMENTUM_START_BPS
    ) {
      sovereignConfidenceSecured =
        true;

      confidenceScore = 1.0;
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

  // -------------------------------------------------------------------
  // BASE CONFIDENCE DECISION
  // -------------------------------------------------------------------

  const basePassed =
    Number.isFinite(confidenceScore) &&
    confidenceScore >= C_FLOOR;

  // Gate passes if baseline confidence is sufficient OR
  // sovereign confidence has activated at +1 BPS.
  const passed =
    basePassed ||
    sovereignConfidenceSecured;

  /*
   * G6 is NOT a hard execution veto.
   *
   * A failed confidence check is recorded as
   * a quality failure. Final execution authority
   * remains with the safety/execution layers.
   */
  const hardVeto = false;

  // ===================================================================
  // QUANTITATIVE LABEL
  // ===================================================================

  let quantitativeLabel = "";

  if (lossBoundaryReached) {

    quantitativeLabel =
      `LOSS_BOUNDARY_REACHED · ` +
      `PnL: ${currentPnLBps.toFixed(2)}bps <= ` +
      `${MAX_LOSS_BPS}bps · ` +
      `Execution boundary: -30 BPS`;

  } else if (targetReached) {

    quantitativeLabel =
      `TARGET_BOUNDARY_REACHED · ` +
      `PnL: ${currentPnLBps.toFixed(2)}bps >= ` +
      `+${TARGET_WIN_BPS}bps · ` +
      `Execution boundary: +30 BPS`;

  } else if (sovereignConfidenceSecured) {

    quantitativeLabel =
      `SOVEREIGN_CONFIDENCE_STARTED · ` +
      `PnL: ${currentPnLBps.toFixed(2)}bps >= ` +
      `${MOMENTUM_START_BPS}bps · ` +
      `Confidence activated from +1 BPS`;

  } else {

    quantitativeLabel =
      `C=${confidenceScore.toFixed(3)} · ` +
      `floor=${C_FLOOR.toFixed(2)}`;
  }

  // ===================================================================
  // FINAL GATE OUTCOME
  // ===================================================================

  return {
    gate: "G6_CONFIDENCE",

    passed,

    score:
      confidenceScore,

    weight: 1.0,

    hardVeto,

    evidence: {

      // ---------------------------------------------------------------
      // CONFIDENCE
      // ---------------------------------------------------------------

      confidenceScore,

      cFloor:
        C_FLOOR,

      volatility,

      ofi,

      k1:
        K1,

      k2:
        K2,

      confidenceFormula:
        "1 - (K1 × volatility + K2 × |OFI| × 0.1)",

      confidenceSufficient:
        passed,

      executionVeto:
        false,

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
      // STRATEGIC STATE
      // ---------------------------------------------------------------

      sovereignConfidenceSecured,

      targetReached,

      lossBoundaryReached,

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
      ? `Confidence passed · ${quantitativeLabel}`
      : `Confidence failed · ${quantitativeLabel} · QUALITY FAIL`,

    specified: true,
  };
};
