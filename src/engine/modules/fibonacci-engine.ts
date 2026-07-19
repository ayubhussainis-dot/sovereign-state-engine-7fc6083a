import { BaseEngine } from "../base-engine";
import { calculateFibonacci, inOTE } from "../fibonacci/calculator";
import type { FibAnalysis, FibLeg, FibOptions } from "../fibonacci/types";

/**
 * Fibonacci / OTE Engine — computes retracements, extensions, and the
 * ICT Optimal Trade Entry (OTE) 0.62–0.79 zone for a swing leg.
 */
export class FibonacciEngine extends BaseEngine {
  private defaults: FibOptions;

  constructor(defaults: FibOptions = {}) {
    super("fibonacci");
    this.defaults = defaults;
  }

  compute(leg: FibLeg, options: FibOptions = {}): FibAnalysis {
    return calculateFibonacci(leg, { ...this.defaults, ...options });
  }

  isInOTE(leg: FibLeg, price: number, options: FibOptions = {}): boolean {
    return inOTE(leg, price, { ...this.defaults, ...options });
  }

  protected async onHealthCheck() {
    return { pure: true };
  }
}
