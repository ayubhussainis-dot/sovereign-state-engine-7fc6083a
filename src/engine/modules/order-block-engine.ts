import { BaseEngine } from "../base-engine";
import { detectOrderBlocks } from "../order-block/detector";
import type {
  OrderBlockAnalysis,
  OrderBlockOptions,
} from "../order-block/types";
import type { OHLCBar } from "../market-structure/types";

/**
 * Order Block Engine — detects bullish / bearish order blocks and tracks
 * mitigation and invalidation across a bar series.
 */
export class OrderBlockEngine extends BaseEngine {
  private defaults: Required<OrderBlockOptions>;

  constructor(defaults: OrderBlockOptions = {}) {
    super("order-block");
    this.defaults = {
      displacementThreshold: defaults.displacementThreshold ?? 0.003,
      displacementWindow: defaults.displacementWindow ?? 3,
      trackMitigation: defaults.trackMitigation ?? true,
    };
  }

  detect(
    bars: readonly OHLCBar[],
    options: OrderBlockOptions = {},
  ): OrderBlockAnalysis {
    return detectOrderBlocks(bars, { ...this.defaults, ...options });
  }

  protected async onHealthCheck() {
    return { ...this.defaults };
  }
}
