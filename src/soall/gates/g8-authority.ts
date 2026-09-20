/**
 * G8 — AUTHORITY
 *
 * Final execution authority.
 *
 * Hard safety requirements:
 *   - G1 synchronization must have passed
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
 *
 * G2–G6 remain visible and contribute to
 * composite quality, but are not mandatory
 * authority blockers.
 */
const REQUIRED_SAFETY_GATES: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G7_RISK",
];

export const g8Authority: Gate = ({
  priorPasses,
  risk,
}): GateOutcome => {
  /*
   * LOCKED_DOWN always blocks execution.
   */
  const healthy =
    risk.systemHealth !== "LOCKED_DOWN";

  /*
   * Check only safety-critical upstream gates.
   */
  const missingSafetyGates: GateId[] =
    REQUIRED_SAFETY_GATES.filter(
      (gateId) => !priorPasses.includes(gateId),
    );

  /*
   * Final authority exists only when:
   *
   * 1. System is healthy.
   * 2. G1 synchronization passed.
   * 3. G7 risk authority passed.
   *
   * G2–G6 do not individually veto.
   */
  const authorityToken =
    healthy &&
    missingSafetyGates.length === 0
      ? 1
      : 0;

  const passed =
    authorityToken === 1;

  /*
   * G8 remains the final hard execution veto.
   */
  const hardVeto =
    !passed;

  return {
    gate: "G8_AUTHORITY",

    passed,

    score: passed ? 1 : 0,

    weight: 1.0,

    hardVeto,

    evidence: {
      authorityToken,

      systemHealth:
        risk.systemHealth,

      requiredSafetyGates: [
        ...REQUIRED_SAFETY_GATES,
      ],

      missingSafetyGates,

      safetyGatesPassed:
        missingSafetyGates.length === 0,

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

    reason: passed
      ? "authority granted · safety gates passed"
      : `authority denied · ${
          missingSafetyGates.length > 0
            ? `failed safety gates: ${missingSafetyGates.join(", ")}`
            : "system locked down"
        } · EXECUTION VETO`,

    specified: true,
  };
};
