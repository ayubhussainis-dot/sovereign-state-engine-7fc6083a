/**
 * Fair Value Gap — Types
 *
 * A three-bar imbalance where the wick range of bar[i-1] and bar[i+1]
 * do not overlap, leaving a "gap" on bar[i]. Bullish FVG: bar[i+1].low
 * > bar[i-1].high. Bearish FVG: bar[i+1].high < bar[i-1].low.
 */

import type { OHLCBar } from "../market-structure/types";

export type FVGKind = "bullish" | "bearish";

export interface FairValueGap {
  kind: FVGKind;
  /** Middle bar index (the displacement bar). */
  index: number;
  time: number;
  /** Gap top price. */
  top: number;
  /** Gap bottom price. */
  bottom: number;
  size: number;
  /** True once price trades into the gap. */
  filled?: boolean;
  filledAt?: number;
  filledIndex?: number;
  /** True once price fully closes through the gap. */
  invalidated?: boolean;
}

export interface FVGOptions {
  /** Minimum gap size as fraction of mid price. Defaults 0 (any gap). */
  minSize?: number;
  /** Track fill / invalidation forward. Defaults true. */
  trackFill?: boolean;
}

export interface FVGAnalysis {
  bars: number;
  gaps: FairValueGap[];
}

export type { OHLCBar };
