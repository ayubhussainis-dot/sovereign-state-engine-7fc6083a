/**
 * AB-HMPTD Bridge
 *
 * Connects the adaptive performance reserve layer to the
 * existing PPG telemetry model.
 *
 * This is an integration layer only.
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

import {
  evaluateABHMPTD,
  type ABHMPTDInput,
  type ABHMPTDState,
} from "./ab-hmptd";

export interface ABHMPTDBridgeInput extends ABHMPTDInput {
  ppgWorkload: number;
  ppgRecovery: number;
}

export interface ABHMPTDBridgeState
  extends ABHMPTDState {
  ppgWorkload: number;
  ppgRecovery: number;
  reserveStress: number;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateABHMPTDBridge(
  input: ABHMPTDBridgeInput,
): ABHMPTDBridgeState {
  const state = evaluateABHMPTD({
    ...input,
    workload: clamp01(input.ppgWorkload),
    recovery: clamp01(input.ppgRecovery),
  });

  const reserveStress = clamp01(
    1 - state.performanceCapacity,
  );

  return {
    ...state,
    ppgWorkload: clamp01(input.ppgWorkload),
    ppgRecovery: clamp01(input.ppgRecovery),
    reserveStress,
  };
}
