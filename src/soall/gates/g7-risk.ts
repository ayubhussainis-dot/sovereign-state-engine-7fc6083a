/**
 * G7 — RISK (ACTIVE RISK & ASYMMETRIC LOSS FLOOR AUTHORITY GATE)
 *
 * Purpose:
 *   Evaluate drawdown, consecutive losses, risk ladder state,
 *   and active asymmetric position parameters before allowing execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * Behavior:
 *   - Risk parameters clear AND active position stays above -10 bps -> PASS
 *   - Drawdown failure OR trade hits the -10 bps asymmetric loss floor -> FAIL (VETO)
 *   - G7 retains direct execution authority.
 */

import { evaluateG2 } from "@/engine/sovereign/g2-checkpoint";
import { evaluateAuthority } from "@/engine/sovereign/risk-authority";
import type { Gate, GateOutcome } from "../types";

const MAX_LOSS_BPS = -10.0;     // Your strict asymmetric loss limit from fill price
const TARGET_WIN_BPS = 24.0;    // Your sovereign macro profit target

export const g7Risk: Gate = ({
  twin,
  risk,
  priorPasses
}): GateOutcome => {
  /*
   * Evaluate the existing risk ladder.
   */
  const ladder = evaluateG2(
    risk.drawdownFraction
  );

  /*
   * Evaluate the existing risk authority.
   */
  const authority = evaluateAuthority({
    drawdownFraction:
      risk.drawdownFraction,

    consecutiveLosses:
      risk.consecutiveLosses,
  });

  // Base institutional metrics verification
  let canTrade = ladder.canTrade && authority.canTrade;
  let activeStrategyVeto = false;
  let strategicReason = "";
  let currentPnLBps = 0;

  // --- SOVEREIGN ACTIVE POSITION RISK CONTROLLER ---
  if (risk && (risk.positionState === "OPEN" || risk.positionState === "MANAGING" || risk.positionState === "HOLDING_STRETCH")) {
    const lastPrice = twin?.last ? parseFloat(twin.last.close || twin.last.price || risk.currentPrice) : risk.currentPrice;
    const multiplier = risk.positionSide === "long" ? 1 : -1;
    currentPnLBps = ((lastPrice - risk.entryPrice) / risk.entryPrice) * multiplier * 10000;

    // CRITICAL PROTECTION: Hard Asymmetric Stop Floor breached (-10 bps from real entry)
    if (currentPnLBps <= MAX_LOSS_BPS) {
      canTrade = false;
      activeStrategyVeto = true;
      strategicReason = `HARD_ASYMMETRIC_LOSS_FLOOR_BREACHED (${currentPnLBps.toFixed(2)}bps)`;
    } 
    // INTERCEPTOR: Enforce the Freedom Zone Hold Window
    else {
      // Check if your core pattern and confidence quality gates (G4 or G6) failed, indicating an inversion signal
      const dynamicInversionSignaled = priorPasses && (!priorPasses.includes("G4_PATTERN") || !priorPasses.includes("G6_CONFIDENCE"));

      if (dynamicInversionSignaled) {
        // If we fluctuate anywhere in the profit or dead loss buffer zone, forcefully suppress the panic cutoff
        if (currentPnLBps > MAX_LOSS_BPS && currentPnLBps < TARGET_WIN_BPS) {
          strategicReason = `FREEDOM_ZONE_ACTIVE (${currentPnLBps.toFixed(2)}bps) · Suppressing early inversion noise.`;
        }
      }
    }
  }

  const score = Math.max(
    0,
    1 - risk.drawdownFraction * 10
  );

  // G7 passes ONLY if baseline capital restrictions pass AND active trading stops stay unbreached
  const passed = canTrade;
  const hardVeto = !canTrade;

  let finalReasonString = "";
  if (activeStrategyVeto) {
    finalReasonString = `risk denied · ${strategicReason} · ASYMMETRIC SHUTDOWN VETO`;
  } else if (canTrade) {
    finalReasonString = `risk permitted · ${ladder.status} · ${authority.state} · ${strategicReason || "Parameters Clear"} · score=${score.toFixed(3)}`;
  } else {
    finalReasonString = `risk denied · ${ladder.reason} · ${authority.reason} · GLOBAL CAPITAL VETO`;
  }

  return {
    gate: "G7_RISK",

    passed,

    score,

    weight: 1.0,

    hardVeto,

    evidence: {
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

      // Extended strategic telemetry for the audit ledger
      activeStrategyVeto,
      currentPnLBps: parseFloat(currentPnLBps.toFixed(2)),
      maxLossBpsFloor: MAX_LOSS_BPS,
      targetWinBpsCeiling: TARGET_WIN_BPS,
      positionState: risk?.positionState ?? "FLAT"
    },

    reason: finalReasonString,

    specified: true,
  };
};
