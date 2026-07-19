import { BaseEngine } from "../base-engine";
import { scoreConfidence } from "../confidence/scorer";
import type {
  ConfidenceFactor,
  ConfidenceOptions,
  ConfidenceResult,
} from "../confidence/types";

/**
 * AI Confidence Scoring Engine — deterministic, explainable scoring
 * layer that grades a thesis A–F based on weighted factors.
 */
export class ConfidenceEngine extends BaseEngine {
  private defaults: ConfidenceOptions;

  constructor(defaults: ConfidenceOptions = {}) {
    super("confidence");
    this.defaults = defaults;
  }

  score(
    factors: readonly ConfidenceFactor[],
    options: ConfidenceOptions = {},
  ): ConfidenceResult {
    return scoreConfidence(factors, { ...this.defaults, ...options });
  }

  protected async onHealthCheck() {
    return { pure: true };
  }
}
