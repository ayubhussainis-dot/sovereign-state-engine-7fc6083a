import { BaseEngine } from "../base-engine";
import { analyzeMTFConfluence } from "../mtf-confluence/analyzer";
import type {
  MTFConfluenceOptions,
  MTFConfluenceResult,
  MTFSnapshot,
} from "../mtf-confluence/types";

/**
 * Multi-Timeframe Confluence Engine — combines per-timeframe structural
 * analyses into a single directional bias and confidence score.
 */
export class MTFConfluenceEngine extends BaseEngine {
  private defaults: MTFConfluenceOptions;

  constructor(defaults: MTFConfluenceOptions = {}) {
    super("mtf-confluence");
    this.defaults = defaults;
  }

  analyze(
    snapshots: readonly MTFSnapshot[],
    options: MTFConfluenceOptions = {},
  ): MTFConfluenceResult {
    return analyzeMTFConfluence(snapshots, { ...this.defaults, ...options });
  }

  protected async onHealthCheck() {
    return { pure: true };
  }
}
