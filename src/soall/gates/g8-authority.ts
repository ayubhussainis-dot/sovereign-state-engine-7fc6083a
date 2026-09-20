/**
 * G8 — AUTHORITY
 *
 * Final execution authority.
 *
 * G8 grants execution only when:
 *   - system health is not LOCKED_DOWN
 *   - every mandatory upstream gate has passed
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
 * Every upstream gate must pass before
 * G8 can grant authority.
 */
const REQUIRED: readonly GateId[] = [
  "G1_SYNCHRONY",
  "G2_STRUCTURE",
  "G3_CONFLUENCE",
  "G4_PATTERN",
  "G5_EXAMINATION",
  "G6_CONFIDENCE",
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
   * priorPasses is an array of GateId values.
   *
   * Check membership with includes().
   */
  const missingGates: GateId[] =
    REQUIRED.filter(
      (gateId) => !priorPasses.includes(gateId),
    );

  /*
   * Authority exists only when:
   *
   * 1. System is healthy.
   * 2. Every mandatory gate has passed.
   */
  const authorityToken =
    healthy &&
    missingGates.length === 0
      ? 1
      : 0;

  const passed =
    authorityToken === 1;

  /*
   * G8 is the final hard execution veto.
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

      requiredGates: [
        ...REQUIRED,
      ],

      missingGates,

      allMandatoryGatesPassed:
        missingGates.length === 0,

      systemHealthy:
        healthy,
    },

    reason: passed
      ? "authority granted · all mandatory gates passed"
      : `authority denied · ${
          missingGates.length > 0
            ? `failed gates: ${missingGates.join(", ")}`
            : "system locked down"
        } · EXECUTION VETO`,

    specified: true,
  };
};
