/**
 * Chassis Architecture
 *
 * Structural integrity layer of the Sovereign Trading Machine.
 *
 * The chassis determines whether the machine can safely carry
 * its current market load.
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

export interface ChassisInput {
  exposure: number;
  maxExposure: number;
  volatility: number;
  exposureHeat: number;
  metabolicDrawdown: number;
}

export interface ChassisState {
  load: number;
  structuralIntegrity: number;
  stability: number;
  overloaded: boolean;
  status: ChassisStatus;
}

export type ChassisStatus =
  | "STABLE"
  | "LOADED"
  | "STRESSED"
  | "OVERLOADED";

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateChassis(
  input: ChassisInput,
): ChassisState {
  const exposureLoad =
    input.maxExposure > 0
      ? Math.abs(input.exposure) / input.maxExposure
      : 0;

  const heatLoad =
    Math.max(0, input.exposureHeat - 85) / 20;

  const volatilityLoad =
    Math.max(0, input.volatility) / 100;

  const metabolicLoad =
    Math.max(0, input.metabolicDrawdown);

  /**
   * Structural load is the combined burden carried
   * by the trading machine.
   */
  const load = clamp01(
    exposureLoad * 0.40 +
    clamp01(heatLoad) * 0.25 +
    clamp01(volatilityLoad) * 0.20 +
    clamp01(metabolicLoad) * 0.15,
  );

  const structuralIntegrity =
    clamp01(1 - load);

  const stability =
    clamp01(
      structuralIntegrity *
      (1 - clamp01(metabolicLoad)),
    );

  let status: ChassisStatus;

  if (load < 0.25) {
    status = "STABLE";
  } else if (load < 0.50) {
    status = "LOADED";
  } else if (load < 0.75) {
    status = "STRESSED";
  } else {
    status = "OVERLOADED";
  }

  return {
    load,
    structuralIntegrity,
    stability,
    overloaded: load >= 0.75,
    status,
  };
}
