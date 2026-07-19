import { BaseEngine } from "../base-engine";
import { detectCandlestickPatterns } from "../candlestick/detector";
import { detectChartPatterns } from "../chart-pattern/detector";
import { decide } from "../decision/engine";
import type { Decision, DecisionInputs, DecisionOptions } from "../decision/types";
import { detectFairValueGaps } from "../fair-value-gap/detector";
import { analyzeLiquidity } from "../liquidity/analyzer";
import { analyzeStructure } from "../market-structure/analyzer";
import type { OHLCBar } from "../market-structure/types";
import { detectOrderBlocks } from "../order-block/detector";

/**
 * AI Decision Engine — fuses outputs of the structural engines into a
 * single scored trade thesis with a stop/target plan.
 *
 * Nothing here is opinionated about execution. The bias, confidence,
 * and plan are just the machine's opinion given the current bar series.
 */
export class DecisionEngine extends BaseEngine {
  private defaults: DecisionOptions;

  constructor(defaults: DecisionOptions = {}) {
    super("decision");
    this.defaults = defaults;
  }

  decide(inputs: DecisionInputs, options: DecisionOptions = {}): Decision {
    return decide(inputs, { ...this.defaults, ...options });
  }

  /**
   * Convenience: run every structural engine and produce a decision from
   * a single OHLC series. Deterministic and dependency-free at the
   * decision layer.
   */
  fromBars(
    symbol: string,
    bars: readonly OHLCBar[],
    options: DecisionOptions = {},
  ): Decision {
    const structure = analyzeStructure(bars);
    const liquidity = analyzeLiquidity(bars);
    const orderBlocks = detectOrderBlocks(bars).blocks;
    const fvgs = detectFairValueGaps(bars).gaps;
    const candlesticks = detectCandlestickPatterns(bars).patterns;
    const chartPatterns = detectChartPatterns(bars).patterns;
    return this.decide(
      { symbol, bars, structure, liquidity, orderBlocks, fvgs, candlesticks, chartPatterns },
      options,
    );
  }

  protected async onHealthCheck() {
    return { defaults: this.defaults };
  }
}
