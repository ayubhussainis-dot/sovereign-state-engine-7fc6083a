/**
 * G5 — EXAMINATION (VELOCITY & TREND SUSTAINABILITY GATE)
 *
 * Purpose:
 *   Determine whether the market has sufficient movement/velocity
 *   to justify active execution.
 *
 * TEST STRATEGY:
 *   - Momentum confirmation begins at +1 BPS
 *   - Winning boundary: +30 BPS
 *   - Loss boundary: -30 BPS
 *   - Same PnL model for long and short positions
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * Behavior:
 *   - Baseline velocity is sufficient -> PASS
 *   - Favorable position movement reaches +1 BPS -> sovereign
 *     velocity confirmation
 *   - +30 BPS -> strategic target boundary
 *   - -30 BPS -> strategic loss boundary
 *   - G5 remains a quality gate, not a hard execution veto.
 */

import type { Gate, GateOutcome } from "../types";

// =====================================================================
// NORMALIZATION
// =====================================================================

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

// =====================================================================
// VELOCITY PARAMETERS
// =====================================================================

const MIN_VELOCITY = 0.001;

const MIN_EXAMINATION_SCORE = 0.20;

/**
 * Sovereign velocity confirmation starts at +1 BPS.
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
// G5 EXAMINATION
// =====================================================================

export const g5Examination: Gate = ({
  ppg,
  twin,
  risk,
}): GateOutcome => {

  // -------------------------------------------------------------------
  // MARKET VELOCITY
  // -------------------------------------------------------------------

  const waveState =
    ppg?.wave?.state ?? "UNKNOWN";

  const velocity =
    ppg?.velocity?.value ?? 0;

  const hasMomentum =
    waveState !== "NODAL_ZERO" &&
    waveState !== "UNKNOWN";

  // -------------------------------------------------------------------
  // BASE VELOCITY SCORE
  // -------------------------------------------------------------------

  const raw =
    clamp01(
      velocity / 0.01
    );

  let score =
    hasMomentum
      ? raw
      : raw * 0.5;

  // -------------------------------------------------------------------
  // SOVEREIGN VELOCITY MONITOR
  // -------------------------------------------------------------------

  let sovereignVelocityConfirmed =
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
    // +1 BPS MOMENTUM START
    // ---------------------------------------------------------------

    if (
      currentPnLBps >=
      MOMENTUM_START_BPS
    ) {
      sovereignVelocityConfirmed =
        true;

      score = 1.0;
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
  // VELOCITY VALIDATION
  // -------------------------------------------------------------------

  const velocitySufficient =
    (
      Number.isFinite(velocity) &&
      velocity >= MIN_VELOCITY
    ) ||
    sovereignVelocityConfirmed;

  const scoreSufficient =
    score >=
      MIN_EXAMINATION_SCORE ||
    sovereignVelocityConfirmed;

  // -------------------------------------------------------------------
  // GATE RESULT
  // -------------------------------------------------------------------

  const passed =
    velocitySufficient &&
    scoreSufficient;

  /*
   * G5 is a quality gate.
   *
   * It does not independently block execution.
   */
  const hardVeto = false;

  // -------------------------------------------------------------------
  // QUANTITATIVE LABEL
  // -------------------------------------------------------------------

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

  } else if (sovereignVelocityConfirmed) {

    quantitativeLabel =
      `SOVEREIGN_VELOCITY_STARTED · ` +
      `PnL: ${currentPnLBps.toFixed(2)}bps >= ` +
      `${MOMENTUM_START_BPS}bps · ` +
      `Velocity active from +1 BPS`;

  } else {

    quantitativeLabel =
      `velocity=${velocity.toFixed(4)}/ms · ` +
      `wave=${waveState}`;
  }

  // ===================================================================
  // FINAL GATE OUTCOME
  // ===================================================================

  return {
    gate: "G5_EXAMINATION",

    passed,

    score,

    weight: 0.75,

    hardVeto,

    evidence: {

      // ---------------------------------------------------------------
      // MARKET VELOCITY
      // ---------------------------------------------------------------

      waveState,

      tickRate:
        velocity,

      minVelocity:
        MIN_VELOCITY,

      minimumScore:
        MIN_EXAMINATION_SCORE,

      rawVelocityScore:
        raw,

      examinationScore:
        score,

      hasMomentum,

      velocitySufficient,

      scoreSufficient,

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

      sovereignVelocityConfirmed,

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
      ? `Examination passed · score=${score.toFixed(3)} · ${quantitativeLabel}`
      : `Examination failed · score=${score.toFixed(3)} · ${quantitativeLabel} · QUALITY FAIL`,

    specified: true,
  };
};
