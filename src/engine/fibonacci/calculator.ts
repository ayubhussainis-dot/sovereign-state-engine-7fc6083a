import type { FibAnalysis, FibLeg, FibLevel, FibOptions } from "./types";

const DEFAULT_RETRACEMENTS = [0.236, 0.382, 0.5, 0.618, 0.705, 0.786];
const DEFAULT_EXTENSIONS = [1.272, 1.414, 1.618, 2.0, 2.618];
const DEFAULT_OTE = { low: 0.62, high: 0.79 };

/**
 * Compute Fibonacci retracement / extension levels and OTE for a leg.
 * `leg.end` is the point being retraced from; `leg.start` is the origin.
 */
export function calculateFibonacci(leg: FibLeg, options: FibOptions = {}): FibAnalysis {
  const retRatios = options.retracements ?? DEFAULT_RETRACEMENTS;
  const extRatios = options.extensions ?? DEFAULT_EXTENSIONS;
  const oteRange = options.ote ?? DEFAULT_OTE;

  const range = leg.end - leg.start;

  const retracements: FibLevel[] = retRatios.map((ratio) => ({
    ratio,
    price: leg.end - range * ratio,
    label: `${(ratio * 100).toFixed(1)}%`,
  }));

  const extensions: FibLevel[] = extRatios.map((ratio) => ({
    ratio,
    price: leg.end + range * (ratio - 1),
    label: `${(ratio * 100).toFixed(1)}%`,
  }));

  const oteLowPrice = leg.end - range * oteRange.low;
  const oteHighPrice = leg.end - range * oteRange.high;
  const ote = {
    low: Math.min(oteLowPrice, oteHighPrice),
    high: Math.max(oteLowPrice, oteHighPrice),
    midpoint: (oteLowPrice + oteHighPrice) / 2,
    ratioLow: oteRange.low,
    ratioHigh: oteRange.high,
  };

  return {
    leg,
    retracements,
    extensions,
    ote,
    equilibrium: leg.end - range * 0.5,
  };
}

/** True when `price` sits inside the OTE band of the given leg. */
export function inOTE(leg: FibLeg, price: number, options: FibOptions = {}): boolean {
  const { ote } = calculateFibonacci(leg, options);
  return price >= ote.low && price <= ote.high;
}
