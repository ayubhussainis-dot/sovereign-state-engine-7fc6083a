import { BaseEngine } from "../base-engine";
import { analyzeLiquidity } from "../liquidity/analyzer";
import type {
  LiquidityAnalysis,
  LiquidityOptions,
} from "../liquidity/types";
import type { OHLCBar } from "../market-structure/types";

/**
 * Liquidity Engine
 *
 * Detects buy-side / sell-side pools, equal highs/lows, sweeps, and
 * stop-hunts. Stateless per call; safe to reuse across timeframes.
 */
export class LiquidityEngine extends BaseEngine {
  private defaults: Required<LiquidityOptions>;

  constructor(defaults: LiquidityOptions = {}) {
    super("liquidity");
    this.defaults = {
      lookback: defaults.lookback ?? 2,
      equalTolerance: defaults.equalTolerance ?? 0.0005,
      reversalWindow: defaults.reversalWindow ?? 3,
      reversalThreshold: defaults.reversalThreshold ?? 0.001,
    };
  }

  analyze(
    bars: readonly OHLCBar[],
    options: LiquidityOptions = {},
  ): LiquidityAnalysis {
    return analyzeLiquidity(bars, { ...this.defaults, ...options });
  }

  protected async onHealthCheck() {
    return { ...this.defaults };
  }
}
