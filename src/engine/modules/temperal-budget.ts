/**
 * Temporal Budget
 *
 * F1-derived time-budget layer.
 *
 * Models how much decision time / capital persistence remains
 * available before a market state becomes stale or inefficient.
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

export interface TemporalBudgetInput {
  elapsed: number;
  budget: number;
  priceVelocity: number;
  marketAcceleration: number;
}

export interface TemporalBudgetState {
  elapsed: number;
  remaining: number;
  utilization: number;
  acceleration: number;
  urgency: number;
  expired: boolean;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateTemporalBudget(
  input: TemporalBudgetInput,
): TemporalBudgetState {
  const budget = Math.max(0, input.budget);
  const elapsed = Math.max(0, input.elapsed);

  const utilization =
    budget > 0
      ? clamp01(elapsed / budget)
      : 1;

  const remaining =
    Math.max(0, budget - elapsed);

  const acceleration =
    clamp01(Math.abs(input.marketAcceleration) / 100);

  const velocity =
    clamp01(Math.abs(input.priceVelocity) / 100);

  const urgency = clamp01(
    utilization * 0.50 +
    acceleration * 0.30 +
    velocity * 0.20,
  );

  return {
    elapsed,
    remaining,
    utilization,
    acceleration,
    urgency,
    expired: elapsed >= budget,
  };
}
