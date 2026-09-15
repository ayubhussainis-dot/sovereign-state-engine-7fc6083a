/**
 * Temporal Budget Bridge
 *
 * Connects the Temporal Budget layer to the existing market
 * timing / decision pipeline.
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

import {
  evaluateTemporalBudget,
  type TemporalBudgetInput,
  type TemporalBudgetState,
} from "./temporal-budget";

export interface TemporalBudgetBridgeInput
  extends TemporalBudgetInput {
  marketAcceleration: number;
  marketVelocity: number;
}

export interface TemporalBudgetBridgeState
  extends TemporalBudgetState {
  marketVelocity: number;
  timePressure: number;
  usableTime: number;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateTemporalBudgetBridge(
  input: TemporalBudgetBridgeInput,
): TemporalBudgetBridgeState {
  const state = evaluateTemporalBudget({
    elapsed: input.elapsed,
    budget: input.budget,
    priceVelocity: input.marketVelocity,
    marketAcceleration: input.marketAcceleration,
  });

  const timePressure = clamp01(
    state.urgency *
      (1 + Math.abs(input.marketAcceleration) / 100),
  );

  const usableTime = clamp01(
    (1 - state.utilization) *
      (1 - clamp01(Math.abs(input.marketAcceleration) / 100)),
  );

  return {
    ...state,
    marketVelocity: input.marketVelocity,
    timePressure,
    usableTime,
  };
}
