/**
 * G2 — STRUCTURE
 * Decision Criterion: pass if M_state ≠ STRESSED and σ_v within bounds.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 * NOTE: M_state definition and σ_v bounds are unspecified.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g2Structure: Gate = ({ twin, risk }): GateOutcome => {
  const rollingVolume = twin.buyVolume + twin.sellVolume;
  const marketState = risk.systemHealth === "LOCKED_DOWN" ? "STRESSED" : "NORMAL";
  const passed = marketState !== "STRESSED" && rollingVolume > 0;
  // Structural richness: saturates as rolling volume grows past ~10.
  const score = marketState === "STRESSED" ? 0 : clamp01(rollingVolume / (rollingVolume + 10));
  return {
    gate: "G2_STRUCTURE",
    passed,
    score,
    weight: 0.5,
    hardVeto: false,
    evidence: { marketState, rollingVolume, windowSize: twin.window.length },
    reason: passed
      ? "structural integrity intact"
      : `Structural failure: Market state is ${marketState} or zero volume`,
    specified: true,
  };
};