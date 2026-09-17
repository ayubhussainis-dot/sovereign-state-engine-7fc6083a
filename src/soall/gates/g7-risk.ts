/**
 * G7 — RISK (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Act as the ultimate safety harness / crash barrier without blocking normal runs.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import { evaluateG2 } from "@/engine/sovereign/g2-checkpoint";
import { evaluateAuthority } from "@/engine/sovereign/risk-authority";
import type { Gate, GateOutcome } from "../types";

export const g7Risk: Gate = ({ risk }): GateOutcome => {
  const drawdownFraction = risk?.drawdownFraction ?? 0;
  const consecutiveLosses = risk?.consecutiveLosses ?? 0;

  const ladder = evaluateG2(drawdownFraction);
  const authority = evaluateAuthority({
    drawdownFraction,
    consecutiveLosses,
  });

  // Normal drawdown is handled organically by the 0.15 stop-loss.
  // G7 only engages its safety harness on catastrophic threshold breaches.
  const isCatastrophic = drawdownFraction > 0.12 || authority.state === "LOCKDOWN";
  
  const passed = !isCatastrophic; 
  const score = Math.max(0.1, 1 - drawdownFraction * 5);
  const hardVeto = isCatastrophic; // Only hard-locks in a true emergency crash scenario

  return {
    gate: "G7_RISK",
    passed,
    score,
    weight: 1,
    hardVeto,
    evidence: {
      drawdownFraction,
      consecutiveLosses,
      ladderStatus: ladder.status,
      authorityState: authority.state,
      sizeMultiplier: ladder.sizeMultiplier,
    },
    reason: passed
      ? `safety harness secure · ${ladder.status} · ${authority.state}`
      : `CRITICAL SAFETY HARNESS ENGAGED: ${ladder.reason} · ${authority.reason}`,
    specified: true,
  };
};
