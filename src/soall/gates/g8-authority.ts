/**
 * G8 — AUTHORITY
 *
 * Final execution authority.
 *
 * TEST CONFIGURATION:
 *   - Momentum starts: +1 BPS
 *   - Winning target:  +30 BPS
 *   - Maximum loss:    -30 BPS
 *   - No 12-BPS tipping point
 *   - No ratchet
 *   - No dip-lock
 *   - No asymmetric -10 BPS floor
 *   - Same PnL model for long and short
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 */

import type {
  Gate,
  GateId,
  GateOutcome,
} from "../types";

// =====================================================================
// REQUIRED SAFETY GATES
// =====================================================================

const REQUIRED_SAFETY_GATES: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G7_RISK",
];

// =====================================================================
// STRATEGIC TEST PARAMETERS
// =====================================================================

/**
 * Favorable movement activation point.
 *
 * This does NOT close the position.
 * It marks the point at which favorable momentum has started.
 */
const MOMENTUM_START_BPS = 1.0;

/**
 * Winning boundary.
 */
const TARGET_WIN_BPS = 30.0;

/**
 * Maximum permitted loss.
 */
const MAX_LOSS_BPS = -30.0;

// =====================================================================
// G8 AUTHORITY
// =====================================================================

export const g8Authority: Gate = ({
  priorPasses,
  risk,
  twin,
}): GateOutcome => {

  // -------------------------------------------------------------------
  // SYSTEM HEALTH
  // -------------------------------------------------------------------

  const healthy =
    risk.systemHealth !==
    "LOCKED_DOWN";

  const lastTick =
    twin?.last;

  const hasTick =
    !!lastTick;

  // -------------------------------------------------------------------
  // SAFETY GATES
  // -------------------------------------------------------------------

  const effectivePriorPasses =
    !hasTick &&
    !priorPasses.includes(
      "G1_SYNCHRONY"
    )
      ? [
          ...priorPasses,
          "G1_SYNCHRONY" as GateId,
        ]
      : priorPasses;

  const missingSafetyGates: GateId[] =
    REQUIRED_SAFETY_GATES.filter(
      (gateId) =>
        !effectivePriorPasses.includes(
          gateId
        )
    );

  // ===================================================================
  // PHASE 1 — BASE AUTHORITY
  // ===================================================================

  let systemAuthorized =
    healthy &&
    missingSafetyGates.length === 0;

  let exitTriggered = false;

  let exitReason:
    | "NONE"
    | "TARGET_WIN_REACHED"
    | "MAX_LOSS_REACHED" =
    "NONE";

  let structuralReason =
    "Authority granted via standard baseline criteria.";

  // ===================================================================
  // POSITION TELEMETRY
  // ===================================================================

  let currentPnLBps = 0;

  let momentumStarted = false;

  let targetReached = false;

  let lossBoundaryReached = false;

  const positionIsLive =
    risk &&
    (
      risk.positionState === "OPEN" ||
      risk.positionState === "MANAGING" ||
      risk.positionState === "HOLDING_STRETCH"
    );

  // ===================================================================
  // PHASE 2 — SYMMETRIC +30 / -30 BPS AUTHORITY
  // ===================================================================

  if (positionIsLive) {

    const currentPrice =
      lastTick
        ? parseFloat(
            lastTick.close ||
            lastTick.price ||
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
      Number.isFinite(
        risk.entryPrice
      ) &&
      risk.entryPrice !== 0
    ) {
      currentPnLBps =
        (
          (
            (currentPrice -
              risk.entryPrice) /
            risk.entryPrice
          ) *
          multiplier *
          10000
        );
    }

    // ---------------------------------------------------------------
    // +1 BPS — MOMENTUM START
    // ---------------------------------------------------------------

    if (
      currentPnLBps >=
      MOMENTUM_START_BPS
    ) {
      momentumStarted = true;
    }

    // ---------------------------------------------------------------
    // +30 BPS — WIN
    // ---------------------------------------------------------------

    if (
      currentPnLBps >=
      TARGET_WIN_BPS
    ) {
      exitTriggered = true;

      systemAuthorized = false;

      targetReached = true;

      exitReason =
        "TARGET_WIN_REACHED";

      structuralReason =
        `TARGET_30BPS_SECURED ` +
        `(PnL: ${currentPnLBps.toFixed(2)}bps >= ` +
        `${TARGET_WIN_BPS}bps)`;
    }

    // ---------------------------------------------------------------
    // -30 BPS — LOSS
    // ---------------------------------------------------------------

    else if (
      currentPnLBps <=
      MAX_LOSS_BPS
    ) {
      exitTriggered = true;

      systemAuthorized = false;

      lossBoundaryReached = true;

      exitReason =
        "MAX_LOSS_REACHED";

      structuralReason =
        `MAX_LOSS_30BPS_REACHED ` +
        `(PnL: ${currentPnLBps.toFixed(2)}bps <= ` +
        `${MAX_LOSS_BPS}bps)`;
    }

    // ---------------------------------------------------------------
    // BETWEEN -30 AND +30
    // ---------------------------------------------------------------

    else {

      structuralReason =
        `POSITION_ACTIVE ` +
        `(PnL: ${currentPnLBps.toFixed(2)}bps) · ` +
        `Momentum +${MOMENTUM_START_BPS.toFixed(1)} BPS · ` +
        `Target +${TARGET_WIN_BPS.toFixed(1)} BPS / ` +
        `Stop ${Math.abs(MAX_LOSS_BPS).toFixed(1)} BPS.`;
    }
  }

  // ===================================================================
  // PHASE 3 — AUTHORITY TOKEN
  // ===================================================================

  const authorityToken =
    systemAuthorized
      ? 1
      : 0;

  // ===================================================================
  // G8 GATE RESULT
  // ===================================================================
  //
  // Unlike the previous version, G8 no longer says:
  //
  //     passed = true
  //     hardVeto = false
  //
  // while simultaneously reporting authorityToken = 0.
  //
  // The gate now accurately reflects its authority state.
  //
  // G7 remains the primary hard risk veto.
  // G8 accurately reports that authority has been withdrawn
  // whenever +30 or -30 settlement is reached.
  // ===================================================================

  const passed =
    systemAuthorized;

  const hardVeto =
    !systemAuthorized;

  // ===================================================================
  // FINAL GATE OUTCOME
  // ===================================================================

  return {
    gate: "G8_AUTHORITY",

    passed,

    score:
      authorityToken,

    weight: 1.0,

    hardVeto,

    evidence: {

      // ---------------------------------------------------------------
      // AUTHORITY
      // ---------------------------------------------------------------

      authorityToken,

      systemHealth:
        risk.systemHealth,

      requiredSafetyGates: [
        ...REQUIRED_SAFETY_GATES,
      ],

      missingSafetyGates,

      safetyGatesPassed:
        missingSafetyGates.length === 0,

      systemHealthy:
        healthy,

      // ---------------------------------------------------------------
      // QUALITY GATES
      // ---------------------------------------------------------------

      qualityGates: [
        "G2_STRUCTURE",
        "G3_CONFLUENCE",
        "G4_PATTERN",
        "G5_EXAMINATION",
        "G6_CONFIDENCE",
      ],

      // ---------------------------------------------------------------
      // UNIFIED BPS STRATEGY
      // ---------------------------------------------------------------

      momentumStartBps:
        MOMENTUM_START_BPS,

      macroTargetWinBps:
        TARGET_WIN_BPS,

      maximumLossBps:
        MAX_LOSS_BPS,

      // ---------------------------------------------------------------
      // LIVE POSITION TELEMETRY
      // ---------------------------------------------------------------

      currentPnLBps:
        parseFloat(
          currentPnLBps.toFixed(2)
        ),

      momentumStarted,

      targetReached,

      lossBoundaryReached,

      exitTriggered,

      exitReason,

      // ---------------------------------------------------------------
      // POSITION STATE
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

      twinSeq:
        lastTick?.twinSeq ??
        -1,
    },

    reason:
      exitTriggered
        ? `STRATEGIC_EXIT_SIGNALED · ${structuralReason}`
        : systemAuthorized
          ? `AUTHORITY_GRANTED · ${structuralReason}`
          : `AUTHORITY_DENIED · ${structuralReason}`,

    specified: true,
  };
};
