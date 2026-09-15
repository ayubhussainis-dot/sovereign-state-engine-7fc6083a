/**
 * Tire Metabolism
 *
 * F1-derived portfolio metabolism layer.
 *
 * Purpose:
 * - Model exposure heat accumulation.
 * - Model capital/exposure decay over time.
 * - Track portfolio drawdown as a bounded metabolic state.
 *
 * This module does NOT decide LONG or SHORT.
 * It does NOT replace PPG or SOALL.
 * It provides structural state for those layers to consume.
 */

export interface TireMetabolismInput {
  positionSize: number;
  volatility: number;
  dt: number;
}

export interface TireMetabolismState {
  exposureHeat: number;
  drawdown: number;
  decayMultiplier: number;
}

export type TireMetabolismProfile =
  | "MEME_STOCK"
  | "TECH_GROWTH"
  | "BLUE_CHIP";

interface MetabolismProfile {
  alpha: number;
  decay: number;
  volRisk: number;
}

/**
 * Profiles translated from the PortfolioMetabolism model
 * in the Sovereign Trading Architecture.
 */
const PROFILES: Record<TireMetabolismProfile, MetabolismProfile> = {
  MEME_STOCK: {
    alpha: 1.88,
    decay: 8.0e-5,
    volRisk: 0.65,
  },

  TECH_GROWTH: {
    alpha: 1.75,
    decay: 4.0e-5,
    volRisk: 0.40,
  },

  BLUE_CHIP: {
    alpha: 1.62,
    decay: 1.5e-5,
    volRisk: 0.25,
  },
};

const INITIAL_EXPOSURE_HEAT = 85.0;
const SAFE_HEAT_THRESHOLD = 105.0;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export class TireMetabolism {
  private readonly profile: MetabolismProfile;

  private exposureHeat: number;
  private drawdown: number;

  constructor(profile: TireMetabolismProfile = "BLUE_CHIP") {
    this.profile = PROFILES[profile];
    this.exposureHeat = INITIAL_EXPOSURE_HEAT;
    this.drawdown = 0;
  }

  /**
   * Update metabolic state from current exposure,
   * market volatility and elapsed time.
   *
   * Equivalent to the source model's:
   * update_capital_decay(position_size, volatility, dt)
   */
  update(input: TireMetabolismInput): TireMetabolismState {
    const positionSize = Math.abs(input.positionSize);
    const volatility = Math.max(0, input.volatility);
    const dt = Math.max(0, input.dt);

    /**
     * Risk generation / thermal loading.
     *
     * Source model:
     * risk_in = 2.5e-4 * abs(position_size * volatility)
     */
    const riskIn =
      2.5e-4 * positionSize * volatility;

    /**
     * Cooling / recovery.
     *
     * Source model:
     * cooling =
     * 0.3 * (0.2 + 0.8 * clip(volatility / 85, 0, 1)) * 28
     */
    const normalizedVolatility = clamp(
      volatility / 85.0,
      0,
      1,
    );

    const cooling =
      0.3 *
      (0.2 + 0.8 * normalizedVolatility) *
      28.0;

    /**
     * Exposure heat evolves through risk generation
     * minus cooling.
     */
    this.exposureHeat +=
      (riskIn - cooling) * dt;

    /**
     * Over-exposure produces additional degradation.
     *
     * Source model:
     * gT = 1 + 0.02 * max(0, exposure_heat - 105)
     */
    const heatMultiplier =
      1.0 +
      0.02 *
        Math.max(
          0,
          this.exposureHeat - SAFE_HEAT_THRESHOLD,
        );

    /**
     * Capital / portfolio decay.
     *
     * Source model:
     * drawdown += decay * abs(position_size) * gT * dt
     */
    this.drawdown = clamp(
      this.drawdown +
        this.profile.decay *
          positionSize *
          heatMultiplier *
          dt,
      0,
      1,
    );

    /**
     * A bounded metabolic multiplier that can later
     * be consumed by Chassis, AB-HMPTD, PPG or SOALL.
     *
     * 1.0 = no metabolic penalty
     * 0.0 = fully exhausted
     */
    const decayMultiplier = clamp(
      1.0 - this.drawdown,
      0,
      1,
    );

    return this.snapshot(decayMultiplier);
  }

  /**
   * Read current metabolic state without modifying it.
   */
  snapshot(
    decayMultiplier = clamp(1.0 - this.drawdown, 0, 1),
  ): TireMetabolismState {
    return {
      exposureHeat: this.exposureHeat,
      drawdown: this.drawdown,
      decayMultiplier,
    };
  }

  /**
   * Reset metabolism for a new trading session.
   */
  reset(): void {
    this.exposureHeat = INITIAL_EXPOSURE_HEAT;
    this.drawdown = 0;
  }

  /**
   * True when the metabolic state has exceeded
   * the safe heat threshold.
   */
  isOverheated(): boolean {
    return this.exposureHeat > SAFE_HEAT_THRESHOLD;
  }
}
