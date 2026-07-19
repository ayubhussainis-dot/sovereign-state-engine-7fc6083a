import { BaseEngine } from "../base-engine";
import { detectChartPatterns } from "../chart-pattern/detector";
import type {
  ChartPatternAnalysis,
  ChartPatternOptions,
} from "../chart-pattern/types";
import type { OHLCBar } from "../market-structure/types";

export class ChartPatternEngine extends BaseEngine {
  private defaults: Required<ChartPatternOptions>;

  constructor(defaults: ChartPatternOptions = {}) {
    super("chart-pattern");
    this.defaults = {
      lookback: defaults.lookback ?? 3,
      tolerance: defaults.tolerance ?? 0.01,
    };
  }

  detect(
    bars: readonly OHLCBar[],
    options: ChartPatternOptions = {},
  ): ChartPatternAnalysis {
    return detectChartPatterns(bars, { ...this.defaults, ...options });
  }

  protected async onHealthCheck() {
    return { ...this.defaults };
  }
}
