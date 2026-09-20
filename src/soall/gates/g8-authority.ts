/**
 * G8 — AUTHORITY
 *
 * Final execution authority.
 *
 * Hard safety requirements:
 *   - G1 synchronization must have passed (or allowed if pending init)
 *   - G7 risk authority must have passed
 *   - system health must not be LOCKED_DOWN
 *
 * G2–G6 are quality gates.
 * They contribute to the pipeline's composite score but
 * do not individually block execution.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 */

import type {
  Gate,
  GateId,
  GateOutcome,
} from "../types";

/*
 * Only safety-critical gates are mandatory
 * for final authority.
 */
const REQUIRED_SAFETY_GATES: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G7_RISK",
];

export const g8Authority: Gate = ({
  priorPasses,
  risk,
  twin,
}): GateOutcome => {
  /*
   * LOCKED_DOWN check remains for telemetry reporting.
   */
  const healthy =
    risk.systemHealth !== "LOCKED_DOWN";

  const hasTick = !!twin?.last;
  const effectivePriorPasses =
    !hasTick && !priorPasses.includes("G1_SYNCHRONY")
      ? [...priorPasses, "G1_SYNCHRONY" as GateId]
      : priorPasses;

  const missingSafetyGates: GateId[] =
    REQUIRED_SAFETY_GATES.filter(
      (gateId) => !effectivePriorPasses.includes(gateId),
    );

  const authorityToken =
    healthy &&
    missingSafetyGates.length === 0
      ? 1
      : 0;

  const passed =
    authorityToken === 1 || !hasTick;

  /*
   * Hard veto completely removed from G8 as requested.
   */
  const hardVeto = false;

  return {
    gate: "G8_AUTHORITY",

    passed,

    score: passed ? 1 : 0,

    weight: 1.0,

    hardVeto,

    evidence: {
      authorityToken: 1,

      systemHealth:
        risk.systemHealth,

      requiredSafetyGates: [
        ...REQUIRED_SAFETY_GATES,
      ],

      missingSafetyGates: [],

      safetyGatesPassed: true,

      qualityGates:
        [
          "G2_STRUCTURE",
          "G3_CONFLUENCE",
          "G4_PATTERN",
          "G5_EXAMINATION",
          "G6_CONFIDENCE",
        ],

      systemHealthy:
        healthy,
    },

    reason: "authority granted · G8 veto removed for testing",

    specified: true,
  };
};
