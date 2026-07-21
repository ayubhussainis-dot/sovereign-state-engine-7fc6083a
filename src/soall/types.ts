/**
 * SOALL 8-Gate Pipeline — Types
 *
 * Governance layer. Every gate is a pure function of `(twin, ppg, ctx)`
 * and returns a `GateOutcome`. The pipeline runs G1..G8 sequentially;
 * the first failure halts and is reported.
 *
 * Contract per gate:
 *   Deterministic · Pure · No side effects · No external deps · Replay safe.
 */

import type { TwinSnapshot } from "@/twin/types";
import type { PPGSnapshot } from "@/ppg/types";

export type GateId =
  | "G1_SYNCHRONY"
  | "G2_STRUCTURE"
  | "G3_CONFLUENCE"
  | "G4_PATTERN"
  | "G5_EXAMINATION"
  | "G6_CONFIDENCE"
  | "G7_RISK"
  | "G8_AUTHORITY";

export const GATE_ORDER: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G2_STRUCTURE",
  "G3_CONFLUENCE",
  "G4_PATTERN",
  "G5_EXAMINATION",
  "G6_CONFIDENCE",
  "G7_RISK",
  "G8_AUTHORITY",
] as const;

export interface RiskContext {
  drawdownFraction: number;
  consecutiveLosses: number;
  systemHealth: "NORMAL" | "DEGRADED" | "LOCKED_DOWN";
}

export interface GateInputs {
  twin: TwinSnapshot;
  ppg: PPGSnapshot;
  risk: RiskContext;
  priorPasses: readonly GateId[];
}

export interface GateOutcome {
  gate: GateId;
  passed: boolean;
  evidence: Readonly<Record<string, unknown>>;
  reason: string;
  /** True when the gate's mathematical model is fully implemented. */
  specified: boolean;
}

export interface GateReport {
  outcomes: readonly GateOutcome[];
  failedAt: GateId | null;
  allPassed: boolean;
  twinSeq: number;
}

export type Gate = (inputs: GateInputs) => GateOutcome;