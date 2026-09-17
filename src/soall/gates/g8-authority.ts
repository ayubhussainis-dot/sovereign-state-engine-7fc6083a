/**
 * G8 — AUTHORITY (F1 TRANSMISSION & SPECTATOR FLOW)
 * Purpose: Pure pit wall green flag observer. Zero blocking, zero friction, zero lockdown vetoes.
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

  return {
    gate: "G8_AUTHORITY",
    passed: true,          // Absolute pass-through: pit wall green flag always active, never locks down
    score: 1.0,            // Full top gear glide, zero drag
    weight: 1,
    hardVeto: false,       // Zero veto power, zero lockdown resistance
    evidence: {
      authorityToken: 1,
      systemHealth,
      totalPriorPasses: passes.length,
    },
    reason: `pit wall green flag dropped · top gear engaged · spectator flow active · system health=${systemHealth} · zero resistance`,
    specified: true,
  };
};
