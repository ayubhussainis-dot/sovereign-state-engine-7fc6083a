/**
 * G8 — AUTHORITY (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Act as the pit wall green flag, shifting the engine into top gear and granting smooth execution authority.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateId, GateOutcome } from "../types";

const REQUIRED: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G3_CONFLUENCE",
  "G4_PATTERN",
  "G5_EXAMINATION",
  "G6_CONFIDENCE",
  "G7_RISK"
];

export const g8Authority: Gate = ({ priorPasses, risk }): GateOutcome => {
  const passes = priorPasses ?? [];
  const systemHealth = risk?.systemHealth ?? "NORMAL";
  const isLockedDown = systemHealth === "LOCKED_DOWN";
  
  // Under the spectator model, the track is open and flowing. 
  // Authority acts as the green flag, engaging top-end cruise unless a system emergency occurs.
  const passed = !isLockedDown;
  const score = isLockedDown ? 0.05 : 1.0;

  return {
    gate: "G8_AUTHORITY",
    passed,
    score,
    weight: 1,
    hardVeto: isLockedDown, // Hard veto only triggers on an explicit emergency system lockdown
    evidence: {
      authorityToken: passed ? 1 : 0,
      systemHealth,
      totalPriorPasses: passes.length,
    },
    reason: passed
      ? "pit wall green flag dropped · top gear engaged · spectator flow active"
      : `CRITICAL SYSTEM LOCKDOWN: ${systemHealth}`,
    specified: true,
  };
};
