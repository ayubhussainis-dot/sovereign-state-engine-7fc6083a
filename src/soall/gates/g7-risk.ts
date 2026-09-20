/**
 * G7 — RISK (ACTIVE RISK AUTHORITY GATE)
 *
 * Purpose:
 *   Evaluate drawdown, consecutive losses, risk ladder state,
 *   and risk authority before allowing capital deployment.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * G7 answers:
 *   "Is the system currently permitted to risk capital?"
 *
 * Risk is an execution constraint.
 * If the risk authority says NO, execution must stop.
 */

import { evaluateG2 } from "@/engine/sovereign/g2-checkpoint";
import { evaluateAuthority } from "@/engine/sovereign/risk-authority";
import type { Gate, GateOutcome } from "../types";

export const g7Risk: Gate = ({
  risk,
}): GateOutcome => {
  /*
   * Evaluate the existing risk ladder.
   */
  const ladder = evaluateG2(
    risk.drawdownFraction
  );

  /*
   * Evaluate the existing risk authority.
   *
   * This considers:
   *   - drawdown
   *   - consecutive losses
   */
  const authority = evaluateAuthority({
    drawdownFraction:
      risk.drawdownFraction,

    consecutiveLosses:
      risk.consecutiveLosses,
  });

  /*
   * Final risk permission.
   *
   * BOTH systems must permit trading.
   */
  const canTrade =
    ladder.canTrade &&
    authority.canTrade;

  /*
   * Preserve the existing risk score.
   *
   * Higher drawdown produces lower score.
   */
  const score = Math.max(
    0,
    1 - risk.drawdownFraction * 10
  );

  /*
   * G7 now has actual execution authority.
   *
   * If either the risk ladder OR risk authority says NO,
   * G7 fails and creates a hard veto.
   */
  const passed = canTrade;

  const hardVeto = !canTrade;

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
    },

    reason: canTrade
      ? `risk permitted · ${ladder.status} · ${authority.state} · score=${score.toFixed(
          3
        )}`
      : `risk denied · ${ladder.reason} · ${authority.reason} · EXECUTION VETO`,

    specified: true,
  };
};
