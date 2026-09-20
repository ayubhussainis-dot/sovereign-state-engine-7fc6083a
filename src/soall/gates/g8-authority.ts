/**
 * G8 — AUTHORITY
 *
 * Decision Criterion:
 *   AuthorityToken == 1
 *   AND system health != LOCKED_DOWN
 *   AND every mandatory gate has passed.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 *
 * G8 is the FINAL execution authority.
 *
 * All upstream gates may measure and evaluate conditions.
 * G8 converts those results into the final permission:
 *
 *   PASS  -> execution may proceed
 *   FAIL  -> execution must be blocked
 */

import type {
  Gate,
  GateId,
  GateOutcome,
} from "../types";

/*
 * Every gate listed here must pass before authority
 * can be granted.
 *
 * G2 was previously missing from this vector.
 * It is now mandatory because market structure is an
 * explicit part of the execution conditions.
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
   * System-level emergency lock.
   *
   * LOCKED_DOWN always means NO execution.
   */
  const healthy =
    risk.systemHealth !== "LOCKED_DOWN";

  /*
   * Identify every mandatory gate that has not passed.
   *
   * This is the actual cumulative pass vector.
   */
  const missingGates: GateId[] =
    REQUIRED.filter(
      (gateId) => priorPasses?.[gateId] !== true
    );

  /*
   * Authority token exists only when:
   *
   * 1. System is healthy.
   * 2. Every mandatory gate passed.
   */
  const authorityToken =
    healthy &&
    missingGates.length === 0
      ? 1
      : 0;

  /*
   * Final authority decision.
   */
  const passed =
    authorityToken === 1;

  /*
   * G8 is the final hard stop.
   *
   * If anything mandatory failed, execution is vetoed.
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
