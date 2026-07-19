import { BaseEngine } from "../base-engine";
import { detectCandlestickPatterns } from "../candlestick/detector";
import type {
  CandlestickAnalysis,
  CandlestickOptions,
} from "../candlestick/types";
import type { OHLCBar } from "../market-structure/types";

export class CandlestickEngine extends BaseEngine {
  private defaults: Required<CandlestickOptions>;

  constructor(defaults: CandlestickOptions = {}) {
    super("candlestick");
    this.defaults = {
      dojiRatio: defaults.dojiRatio ?? 0.1,
      wickRatio: defaults.wickRatio ?? 2,
      marubozuRatio: defaults.marubozuRatio ?? 0.9,
      tweezerTolerance: defaults.tweezerTolerance ?? 0.001,
    };
  }

  detect(
    bars: readonly OHLCBar[],
    options: CandlestickOptions = {},
  ): CandlestickAnalysis {
    return detectCandlestickPatterns(bars, { ...this.defaults, ...options });
  }

  protected async onHealthCheck() {
    return { ...this.defaults };
  }
}
