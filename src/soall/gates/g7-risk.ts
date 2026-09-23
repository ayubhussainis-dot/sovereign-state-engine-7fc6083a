/**
 * G7 — RISK (ACTIVE RISK & SYMMETRIC ±30 BPS AUTHORITY GATE)
 *
 * Purpose:
 *   Evaluate drawdown, consecutive losses, risk ladder state,
 *   and active position boundaries before allowing execution.
 *
 * TEST STRATEGY:
 *   - Momentum starts at +1 BPS
 *   - Winning boundary: +30 BPS
 *   - Loss boundary: -30 BPS
 *   - Same PnL model for long and short positions
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * Behavior:
 *   - Institutional risk parameters clear -> PASS
 *   - Active position remains above -30 BPS -> PASS
 *   - Active position reaches -30 BPS -> FAIL / HARD VETO
 *   - G7 retains direct execution risk authority.
 */

import { evaluateG2 } from "@/engine/sovereign/g2-checkpoint";
import { evaluateAuthority } from "@/engine/sovereign/risk-authority";
import type { Gate, GateOutcome } from "../types";

// =====================================================================
// STRATEGIC PARAMETERS
// =====================================================================

/**
 * Favorable movement begins at +1 BPS.
 *
 * This is an activation/telemetry boundary, not the exit target.
 */
const MOMENTUM_START_BPS = 1.0;

/**
 * Winning boundary.
 */
const TARGET_WIN_BPS = 30.0;

/**
 * Maximum permitted loss from actual fill.
 *
 * This is the HARD RISK VETO boundary.
 */
const MAX_LOSS_BPS = -30.0;

// =====================================================================
// G7 RISK
// =====================================================================

export const g7Risk: Gate = ({
  twin,
  risk,
  priorPasses,
}): GateOutcome => {

  // -------------------------------------------------------------------
  // EXISTING RISK LADDER
  // -------------------------------------------------------------------

  const ladder = evaluateG2(
    risk.drawdownFraction
  );

  // -------------------------------------------------------------------
  // EXISTING RISK AUTHORITY
  // -------------------------------------------------------------------

  const authority =
    evaluateAuthority({
      drawdownFraction:
        risk.drawdownFraction,

      consecutiveLosses:
        risk.consecutiveLosses,
    });

  // -------------------------------------------------------------------
  // BASE INSTITUTIONAL RISK
  // -------------------------------------------------------------------

  let canTrade =
    ladder.canTrade &&
    authority.canTrade;

  let activeStrategyVeto =
    false;

  let strategicReason =
    "";

  let currentPnLBps =
    0;

  let momentumStarted =
    false;

  let targetReached =
    false;

  let lossBoundaryReached =
    false;

  // -------------------------------------------------------------------
  // LIVE POSITION RISK CONTROLLER
  // -------------------------------------------------------------------

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
    // UNIFIED LONG / SHORT PNL
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
      momentumStarted = true;
    }

    // ---------------------------------------------------------------
    // +30 BPS WIN BOUNDARY
    // ---------------------------------------------------------------

    if (
      currentPnLBps >=
      TARGET_WIN_BPS
    ) {
      targetReached = true;

      /*
       * G7 does not close the trade itself.
       *
       * The execution layer / G8 handles settlement.
       *
       * Therefore reaching +30 BPS is recorded here,
       * but it is NOT a risk veto.
       */
      strategicReason =
        `TARGET_30BPS_REACHED ` +
        `(${currentPnLBps.toFixed(2)}bps)`;
    }

    // ---------------------------------------------------------------
    // -30 BPS HARD LOSS BOUNDARY
    // ---------------------------------------------------------------

    if (
      currentPnLBps <=
      MAX_LOSS_BPS
    ) {
      canTrade = false;

      activeStrategyVeto =
        true;

      lossBoundaryReached =
        true;

      strategicReason =
        `MAX_LOSS_30BPS_BREACHED ` +
        `(${currentPnLBps.toFixed(2)}bps)`;
    }

    // ---------------------------------------------------------------
    // FREEDOM-ZONE / INVERSION TELEMETRY
    //
    // This does NOT override the -30 BPS hard boundary.
    // ---------------------------------------------------------------

    if (
      !lossBoundaryReached
    ) {

      const dynamicInversionSignaled =
        priorPasses &&
        (
          !priorPasses.includes(
            "G4_PATTERN"
          ) ||
          !priorPasses.includes(
            "G6_CONFIDENCE"
          )
        );

      if (
        dynamicInversionSignaled &&
        currentPnLBps > MAX_LOSS_BPS &&
        currentPnLBps < TARGET_WIN_BPS
      ) {

        strategicReason =
          `FREEDOM_ZONE_ACTIVE ` +
          `(${currentPnLBps.toFixed(2)}bps) · ` +
          `Inversion noise suppressed.`;
      }
    }
  }

  // -------------------------------------------------------------------
  // BASE RISK SCORE
  // -------------------------------------------------------------------

  const score =
    Math.max(
      0,
      1 -
        risk.drawdownFraction * 10
    );

  // -------------------------------------------------------------------
  // FINAL G7 DECISION
  // -------------------------------------------------------------------

  const passed =
    canTrade;

  /*
   * G7 is the direct risk authority.
   *
   * If the -30 BPS boundary is breached,
   * hardVeto becomes TRUE.
   */
  const hardVeto =
    !canTrade;

  // -------------------------------------------------------------------
  // FINAL REASON
  // -------------------------------------------------------------------

  let finalReasonString = "";

  if (activeStrategyVeto) {

    finalReasonString =
      `risk denied · ` +
      `${strategicReason} · ` +
      `SYMMETRIC -30 BPS SHUTDOWN VETO`;

  } else if (canTrade) {

    finalReasonString =
      `risk permitted · ` +
      `${ladder.status} · ` +
      `${authority.state} · ` +
      `${
        strategicReason ||
        "Parameters Clear"
      } · ` +
      `score=${score.toFixed(3)}`;

  } else {

    finalReasonString =
      `risk denied · ` +
      `${ladder.reason} · ` +
      `${authority.reason} · ` +
      `GLOBAL CAPITAL VETO`;
  }

  // ===================================================================
  // FINAL GATE OUTCOME
  // ===================================================================

  return {
    gate: "G7_RISK",

    passed,

    score,

    weight: 1.0,

    hardVeto,

    evidence: {

      // ---------------------------------------------------------------
      // INSTITUTIONAL RISK
      // ---------------------------------------------------------------

      drawdownFraction:
        risk.drawdownFraction,

      consecutiveLosses:
        risk.consecutiveLosses,

      ladderStatus:
        ladder.status,

      authorityState:
        authority.state,

      sizeMultiplier:
        ladder.sizeMultiplier,

      riskPermitted:
        canTrade,

      ladderPermitted:
        ladder.canTrade,

      authorityPermitted:
        authority.canTrade,

      // ---------------------------------------------------------------
      // UNIFIED BPS MODEL
      // ---------------------------------------------------------------

      currentPnLBps:
        parseFloat(
          currentPnLBps.toFixed(2)
        ),

      momentumStartBps:
        MOMENTUM_START_BPS,

      maxLossBpsFloor:
        MAX_LOSS_BPS,

      targetWinBpsCeiling:
        TARGET_WIN_BPS,

      // ---------------------------------------------------------------
      // STRATEGIC TELEMETRY
      // ---------------------------------------------------------------

      momentumStarted,

      targetReached,

      lossBoundaryReached,

      activeStrategyVeto,

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

    reason:
      finalReasonString,

    specified: true,
  };
};
