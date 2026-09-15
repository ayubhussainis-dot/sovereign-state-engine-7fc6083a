/**
 * Battlefield Environment
 *
 * F1-derived market-environment layer.
 *
 * Translates external market conditions into a deterministic
 * environmental state for the Sovereign Trading Machine.
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

export interface BattlefieldInput {
  volatility: number;
  liquidity: number;
  spread: number;
  orderBookDensity: number;
  priceVelocity: number;
}

export interface BattlefieldState {
  volatilityLoad: number;
  liquidityStress: number;
  spreadStress: number;
  densityStress: number;
  velocityLoad: number;
  environmentalStress: number;
  status: BattlefieldStatus;
}

export type BattlefieldStatus =
  | "CALM"
  | "ACTIVE"
  | "STRESSED"
  | "HOSTILE";

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateBattlefield(
  input: BattlefieldInput,
): BattlefieldState {
  const volatilityLoad =
    clamp01(Math.max(0, input.volatility) / 100);

  const liquidityStress =
    clamp01(1 - Math.max(0, input.liquidity));

  const spreadStress =
    clamp01(Math.max(0, input.spread) / 100);

  const densityStress =
    clamp01(1 - Math.max(0, input.orderBookDensity));

  const velocityLoad =
    clamp01(Math.abs(input.priceVelocity) / 100);

  const environmentalStress = clamp01(
    volatilityLoad * 0.30 +
    liquidityStress * 0.25 +
    spreadStress * 0.15 +
    densityStress * 0.15 +
    velocityLoad * 0.15,
  );

  let status: BattlefieldStatus;

  if (environmentalStress < 0.25) {
    status = "CALM";
  } else if (environmentalStress < 0.50) {
    status = "ACTIVE";
  } else if (environmentalStress < 0.75) {
    status = "STRESSED";
  } else {
    status = "HOSTILE";
  }

  return {
    volatilityLoad,
    liquidityStress,
    spreadStress,
    densityStress,
    velocityLoad,
    environmentalStress,
    status,
  };
}
