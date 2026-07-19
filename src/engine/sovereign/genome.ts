/**
 * Sovereign Genome — cell-cycle FSM ported from the Mean Money Machine
 * donor architecture. Additive to HETIS: the DecisionEngine still owns
 * trade decisions; this FSM is a governance overlay that gates when the
 * system is *allowed* to act.
 */

export type Phase =
  | "G0_HOMEOSTASIS"
  | "JOKER_SIGNAL"
  | "G1_ACCUMULATION"
  | "S_MULTIPLIER"
  | "G2_CHECKPOINT"
  | "M_MITOSIS"
  | "Z_MODE"
  | "SYSTEM_INTERRUPT";

/** Allowed transitions. Anything not listed here is illegal. */
export const GENOME_EDGES: Record<Phase, readonly Phase[]> = {
  G0_HOMEOSTASIS: ["JOKER_SIGNAL", "SYSTEM_INTERRUPT"],
  JOKER_SIGNAL: ["G1_ACCUMULATION", "SYSTEM_INTERRUPT"],
  G1_ACCUMULATION: ["S_MULTIPLIER", "SYSTEM_INTERRUPT"],
  S_MULTIPLIER: ["G2_CHECKPOINT", "SYSTEM_INTERRUPT"],
  G2_CHECKPOINT: ["M_MITOSIS", "G0_HOMEOSTASIS"],
  M_MITOSIS: ["Z_MODE"],
  Z_MODE: ["G0_HOMEOSTASIS"],
  SYSTEM_INTERRUPT: ["M_MITOSIS"],
};

export function isLegalTransition(from: Phase, to: Phase): boolean {
  if (from === to) return true;
  return GENOME_EDGES[from]?.includes(to) ?? false;
}

export const PHASE_LABELS: Record<Phase, string> = {
  G0_HOMEOSTASIS: "G0 · Homeostasis",
  JOKER_SIGNAL: "Joker · Volatility Wake",
  G1_ACCUMULATION: "G1 · Accumulation",
  S_MULTIPLIER: "S · Leverage",
  G2_CHECKPOINT: "G2 · Checkpoint",
  M_MITOSIS: "M · Mitosis",
  Z_MODE: "Z · Recovery",
  SYSTEM_INTERRUPT: "Sovereign Interrupt",
};
