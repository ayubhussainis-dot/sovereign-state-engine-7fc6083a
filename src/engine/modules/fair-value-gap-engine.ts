import { BaseEngine } from "../base-engine";
import { detectFairValueGaps } from "../fair-value-gap/detector";
import type { FVGAnalysis, FVGOptions } from "../fair-value-gap/types";
import type { OHLCBar } from "../market-structure/types";

export class FairValueGapEngine extends BaseEngine {
  private defaults: Required<FVGOptions>;

  constructor(defaults: FVGOptions = {}) {
    super("fair-value-gap");
    this.defaults = {
      minSize: defaults.minSize ?? 0,
      trackFill: defaults.trackFill ?? true,
    };
  }

  detect(bars: readonly OHLCBar[], options: FVGOptions = {}): FVGAnalysis {
    return detectFairValueGaps(bars, { ...this.defaults, ...options });
  }

  protected async onHealthCheck() {
    return { ...this.defaults };
  }
}
