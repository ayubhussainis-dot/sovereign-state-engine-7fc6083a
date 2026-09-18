/**
 * G3 — CONFLUENCE (ABHMPT MULTI-FACTOR SCORING)
 * Purpose: Evaluates order flow imbalance and conviction via ABHMPT telemetry.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";
import { evaluateAbHmpt } from "@/engine/modules/ab-hmptd";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg, twin }): GateOutcome => {
  const abhState = evaluateAbHmpt({ twin, ppg });
  const rawOfi = ppg?.ofi?.value ?? 0;
  const normalizedOfi = Math.min(Math.abs(rawOfi) / 1e9, 1.0);
  
  const finalScore = clamp01((normalizedOfi * 0.5) + (abhState.conviction * 0.5));

  return {
    gate: "G3_CONFLUENCE",
    passed: true,          // Non-blocking scoring pass
    score: finalScore,     
    weight: 1.0,           
    hardVeto: false,       
    evidence: {
      ofiProxy: rawOfi,
      abhConviction: abhState.conviction,
      regime: abhState.regime
    },
    reason: `ABHMPT confluence scored · conviction=${abhState.conviction.toFixed(3)}`,
    specified: true,
  };
};
