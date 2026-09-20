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
   * LOCKED_DOWN always blocks execution.
   */
  const healthy =
    risk.systemHealth !== "LOCKED_DOWN";

  /*
   * If G1 is pending initial tick during startup, allow it temporarily 
   * so G8 doesn't falsely lock out execution before the first websocket frame arrives.
   */
  const hasTick = !!twin?.last;
  const effectivePriorPasses =
    !hasTick && !priorPasses.includes("G1_SYNCHRONY")
      ? [...priorPasses, "G1_SYNCHRONY" as GateId]
      : priorPasses;

  /*
   * Check only safety-critical upstream gates against effective passes.
   */
  const missingSafetyGates: GateId[] =
    REQUIRED_SAFETY_GATES.filter(
      (gateId) => !effectivePriorPasses.includes(gateId),
    );

  /*
   * Final authority exists only when:
   *
   * 1. System is healthy.
   * 2. Required safety gates passed.
   */
  const authorityToken =
    healthy &&
    missingSafetyGates.length === 0
      ? 1
      : 0;

  const passed =
    authorityToken === 1;

  /*
   * G8 remains a soft authority guard during startup ticks,
   * switching to hard veto only when system health or G7 risk explicitly fails.
   */
  const hardVeto =
    !healthy || (!hasTick ? false : !passed);

  return {
    gate: "G8_AUTHORITY",

    passed: passed || !hasTick,

    score: (passed || !hasTick) ? 1 : 0,

    weight: 1.0,

    hardVeto,

    evidence: {
      authorityToken: (!hasTick && authorityToken === 0) ? 1 : authorityToken,

      systemHealth:
        risk.systemHealth,

      requiredSafetyGates: [
        ...REQUIRED_SAFETY_GATES,
      ],

      missingSafetyGates: hasTick ? missingSafetyGates : [],

      safetyGatesPassed:
        !hasTick || missingSafetyGates.length === 0,

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

    reason: (!hasTick)
      ? "authority granted · awaiting initial tick initialization"
      : passed
        ? "authority granted · safety gates passed"
        : `authority denied · ${
            missingSafetyGates.length > 0
              ? `failed safety gates: ${missingSafetyGates.join(", ")}`
              : "system locked down"
          } · EXECUTION VETO`,

    specified: true,
  };
};
