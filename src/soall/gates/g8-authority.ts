/**
 * G8 — AUTHORITY (SYSTEM LOCK-DOWN SAFEGUARD)
 * Purpose: Final executive gate. Verifies systemic authorization and vault integrity.
 * Contract: Deterministic · Pure · No side effects · Replay safe.
 */

import type { Gate, GateOutcome } from "../types";

export const g8Authority: Gate = ({ systemAuthority }): GateOutcome => {
  const isLockedDown = systemAuthority?.lockdown ?? false;
  const finalScore = isLockedDown ? 0.0 : 1.0;
  const isHealthy = !isLockedDown;

  return {
    gate: "G8_AUTHORITY",
    passed: isHealthy,     // ACTIVE SYSTEM AUTHORITY VETO
    score: finalScore,
    weight: 2.0,
    hardVeto: true,        // Final executive lockdown power
    evidence: { isLockedDown },
    reason: isHealthy
      ? `system authority cleared · execution authorized`
      : `AUTHORITY VETO: system locked down by risk framework`,
    specified: true,
  };
};
