/**
 * Sovereign Gating — pure function that folds the FSM's current authority,
 * G2 status and circadian wave into a single size multiplier + trade-permit.
 *
 * This is the seam between the Sovereign overlay and the Risk calculator.
 * Consumers (Decision/Risk engines, backtester) call `applySovereignGating`
 * on top of `calculatePositionSize` to enforce the operating system's
 * policy without altering the underlying sizing math.
 */

import type { AuthorityReading } from "./risk-authority";
import type { G2Reading } from "./g2-checkpoint";

export interface SovereignGate {
  permit: boolean;
  sizeMultiplier: number;
  reason: string;
}

export function applySovereignGating(
  authority: AuthorityReading,
  g2: G2Reading,
  wave: number,
): SovereignGate {
  if (!authority.canTrade) {
    return { permit: false, sizeMultiplier: 0, reason: `authority ${authority.state}: ${authority.reason}` };
  }
  if (!g2.canTrade) {
    return { permit: false, sizeMultiplier: 0, reason: `g2 ${g2.status}: ${g2.reason}` };
  }
  const w = Math.max(0, Math.min(1, wave));
  const mult = g2.sizeMultiplier * (0.5 + 0.5 * w); // wave modulates from 0.5x to 1x
  return {
    permit: true,
    sizeMultiplier: mult,
    reason: `g2 ${g2.status} ×${g2.sizeMultiplier.toFixed(2)}, wave ${w.toFixed(2)}`,
  };
}
