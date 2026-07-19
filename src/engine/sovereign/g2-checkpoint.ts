/**
 * G2 Checkpoint — drawdown ladder gate. Pure function.
 *
 * HETIS already owns full drawdown math in `src/engine/risk/calculator.ts`
 * (`computeDrawdown`). This module is a *policy* layer on top: it maps a
 * drawdown fraction into a canTrade decision + size multiplier so callers
 * (Decision/Risk consumers) can enforce a uniform circuit-breaker ladder.
 */

export type G2Status = "NORMAL" | "CAUTION" | "RESTRICTED" | "HALTED";

export interface G2Reading {
  status: G2Status;
  canTrade: boolean;
  sizeMultiplier: number;
  drawdownFraction: number;
  reason: string;
}

/** `drawdownFraction` is a positive number: 0.032 == 3.2% drawdown. */
export function evaluateG2(drawdownFraction: number): G2Reading {
  const dd = Math.max(0, drawdownFraction);
  if (dd >= 0.05) {
    return {
      status: "HALTED",
      canTrade: false,
      sizeMultiplier: 0,
      drawdownFraction: dd,
      reason: "Drawdown ≥ 5% — sovereign halt",
    };
  }
  if (dd >= 0.03) {
    return {
      status: "RESTRICTED",
      canTrade: false,
      sizeMultiplier: 0.25,
      drawdownFraction: dd,
      reason: "Drawdown ≥ 3% — restricted",
    };
  }
  if (dd >= 0.015) {
    return {
      status: "CAUTION",
      canTrade: true,
      sizeMultiplier: 0.5,
      drawdownFraction: dd,
      reason: "Drawdown ≥ 1.5% — cautious sizing",
    };
  }
  return {
    status: "NORMAL",
    canTrade: true,
    sizeMultiplier: 1,
    drawdownFraction: dd,
    reason: "Within normal drawdown envelope",
  };
}
