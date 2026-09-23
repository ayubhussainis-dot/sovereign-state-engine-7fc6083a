/**
 * G5 — EXAMINATION (VELOCITY & TREND SUSTAINABILITY GATE)
 *
 * Purpose:
 *   Determine whether the market has sufficient movement/velocity
 *   to justify active execution, specifically tracking the 12-bps sovereign threshold.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * Behavior:
 *   - Velocity meets baselines OR hits the 12-bps tipping point -> PASS
 *   - Nodal dead zones or insufficient asset velocity -> FAIL
 *   - G5 remains a quality gate, not a hard execution veto.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number): number =>
  n < 0 ? 0 : n > 1 ? 1 : n;

const MIN_VELOCITY = 0.001;
const MIN_EXAMINATION_SCORE = 0.20;
const TIPPING_POINT_BPS = 12.0; // The sovereign momentum point of no return

export const g5Examination: Gate = ({
  ppg,
  twin,
  risk,
}): GateOutcome => {
  const waveState =
    ppg?.wave?.state ?? "UNKNOWN";

  const velocity =
    ppg?.velocity?.value ?? 0;

  const hasMomentum =
    waveState !== "NODAL_ZERO" &&
    waveState !== "UNKNOWN";

  const raw =
    clamp01(velocity / 0.01);

  let score =
    hasMomentum
      ? raw
      : raw * 0.5;

  // --- SOVEREIGN VELOCITY MONITOR ---
  // If the trade is live and has cleared the 12 bps tipping point, maximize the velocity score
  let sovereignVelocityConfirmed = false;
  let currentPnLBps = 0;

  if (risk && (risk.positionState === "OPEN" || risk.positionState === "MANAGING" || risk.positionState === "HOLDING_STRETCH")) {
    const lastPrice = twin?.last ? parseFloat(twin.last.close || twin.last.price || risk.currentPrice) : risk.currentPrice;
    const multiplier = risk.positionSide === "long" ? 1 : -1;
    currentPnLBps = ((lastPrice - risk.entryPrice) / risk.entryPrice) * multiplier * 10000;

    if (currentPnLBps >= TIPPING_POINT_BPS) {
      sovereignVelocityConfirmed = true;
      score = 1.0; // Force maximum velocity rating
    }
  }

  const velocitySufficient =
    (Number.isFinite(velocity) && velocity >= MIN_VELOCITY) || sovereignVelocityConfirmed;

  const scoreSufficient =
    score >= MIN_EXAMINATION_SCORE || sovereignVelocityConfirmed;

  // Passes if baseline velocity is sufficient OR if sovereign breakout is confirmed
  const passed =
    velocitySufficient &&
    scoreSufficient;

  /*
   * G5 is a quality gate.
   * Failure contributes to the gate result and score,
   * but does not independently block execution.
   */
  const hardVeto = false;

  let quantitativeLabel = "";
  if (sovereignVelocityConfirmed) {
    quantitativeLabel = `SOVEREIGN_VELOCITY_SECURED · PnL: ${currentPnLBps.toFixed(2)}bps >= ${TIPPING_POINT_BPS}bps · Wave confirmed.`;
  } else {
    quantitativeLabel = `velocity=${velocity.toFixed(4)}/ms · wave=${waveState}`;
  }

  return {
    gate: "G5_EXAMINATION",

    passed,

    score,

    weight: 0.75,

    hardVeto,

    evidence: {
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

      // Extended analytics for your audit records
      sovereignVelocityConfirmed,
      currentPnLBps: parseFloat(currentPnLBps.toFixed(2)),
      tippingPointThresholdBps: TIPPING_POINT_BPS,
      positionState: risk?.positionState ?? "FLAT"
    },

    reason: passed
      ? `Examination passed · score=${score.toFixed(3)} · ${quantitativeLabel}`
      : `Examination failed · score=${score.toFixed(3)} · ${quantitativeLabel} · QUALITY FAIL`,

    specified: true,
  };
};
