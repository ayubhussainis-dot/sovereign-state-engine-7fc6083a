/**
 * G3 — CONFLUENCE (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Pure wave telemetry observer. Zero blocking, zero friction.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const g3Confluence: Gate = ({ ppg }): GateOutcome => {
  const ofiValue = ppg?.ofi?.value ?? 0;
  const waveState = ppg?.wave?.state ?? "UNKNOWN";
  
  const confluenceScore = Math.abs(ofiValue);
  const raw = clamp01(confluenceScore / 0.2);
  const score = raw > 0 ? raw : 1.0; // Full transmission glide across all wave states

  return {
    gate: "G3_CONFLUENCE",
    passed: true,          // Absolute pass-through: wave grades form, never restricts
    score,
    weight: 1,
    hardVeto: false,       // Zero veto power, zero resistance
    evidence: {
      ofiProxy: ofiValue,
      confluenceScore,
      waveState,
    },
    reason: `wave confluence flowing freely · score=${score.toFixed(3)} · OFI=${ofiValue.toFixed(4)} · wave=${waveState}`,
    specified: true,
  };
};
