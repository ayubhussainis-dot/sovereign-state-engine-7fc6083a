/**
 * G6 — CONFIDENCE (MACRO ALPHA & TREND STABILITY GATE)
 *
 * Decision Criterion:
 *   Pass if C >= C_FLOOR or optimized by sovereign trend confirmations.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * Behavior:
 *   - Calculated confidence score meets baseline OR sovereign velocity is active -> PASS
 *   - Volatility shock or flow decay under standard baseline -> FAIL
 *   - G6 remains a quality gate, not a hard execution veto.
 */

import type { Gate, GateOutcome } from "../types";

const K1 = 2.0;
const K2 = 1.0;
const C_FLOOR = 0.60;
const TIPPING_POINT_BPS = 12.0; // The sovereign momentum point of no return

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

export const g6Confidence: Gate = ({
  ppg,
  twin,
  risk,
}): GateOutcome => {
  const volatility =
    ppg?.volatility?.value ?? 0;

  const ofi =
    ppg?.ofi?.value ?? 0;

  /*
   * Preserve the existing confidence mathematics exactly:
   * C = 1 - (K1 × volatility + K2 × |OFI| × 0.1)
   */
  const rawConfidence =
    1.0 -
    (
      K1 * volatility +
      K2 * Math.abs(ofi) * 0.1
    );

  let confidenceScore = clamp01(rawConfidence);

  // --- SOVEREIGN CONFIDENCE RATCHET MODIFIER ---
  // If the position is actively open and has cleanly cleared your 12 bps point of no return,
  // we recognize that the move has converted into a confirmed trend and maximize confidence.
  let sovereignConfidenceSecured = false;
  let currentPnLBps = 0;

  if (risk && (risk.positionState === "OPEN" || risk.positionState === "MANAGING" || risk.positionState === "HOLDING_STRETCH")) {
    const lastPrice = twin?.last ? parseFloat(twin.last.close || twin.last.price || risk.currentPrice) : risk.currentPrice;
    const multiplier = risk.positionSide === "long" ? 1 : -1;
    currentPnLBps = ((lastPrice - risk.entryPrice) / risk.entryPrice) * multiplier * 10000;

    if (currentPnLBps >= TIPPING_POINT_BPS) {
      sovereignConfidenceSecured = true;
      confidenceScore = 1.0; // Force maximum structural confidence rating
    }
  }

  /*
   * Actual confidence decision.
   */
  const basePassed =
    Number.isFinite(confidenceScore) &&
    confidenceScore >= C_FLOOR;

  // Gate passes if baseline confidence is sufficient OR if sovereign wave is locked
  const passed = basePassed || sovereignConfidenceSecured;

  /*
   * G6 is NOT a hard execution veto.
   *
   * A failed confidence check is recorded as
   * a quality failure, while final execution
   * authority remains with the safety gates
   * and G8.
   */
  const hardVeto = false;

  let quantitativeLabel = "";
  if (sovereignConfidenceSecured) {
    quantitativeLabel = `SOVEREIGN_CONFIDENCE_SECURED · PnL: ${currentPnLBps.toFixed(2)}bps >= ${TIPPING_POINT_BPS}bps · Score maxed.`;
  } else {
    quantitativeLabel = `C=${confidenceScore.toFixed(3)} · floor=${C_FLOOR.toFixed(2)}`;
  }

  return {
    gate: "G6_CONFIDENCE",

    passed,

    score: confidenceScore,

    weight: 1.0,

    hardVeto,

    evidence: {
      confidenceScore,
      cFloor: C_FLOOR,
      volatility,
      ofi,
      k1: K1,
      k2: K2,
      confidenceFormula: "1 - (K1 × volatility + K2 × |OFI| × 0.1)",
      confidenceSufficient: passed,
      executionVeto: false,
      
      // Extended sovereign metrics for the audit ledger trail
      sovereignConfidenceSecured,
      currentPnLBps: parseFloat(currentPnLBps.toFixed(2)),
      tippingPointThresholdBps: TIPPING_POINT_BPS,
      positionState: risk?.positionState ?? "FLAT"
    },

    reason: passed
      ? `Confidence passed · ${quantitativeLabel}`
      : `Confidence failed · ${quantitativeLabel} · QUALITY FAIL`,

    specified: true,
  };
};
