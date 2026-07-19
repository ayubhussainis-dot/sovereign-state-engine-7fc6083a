/**
 * Chart Pattern Recognition — Types
 *
 * Multi-bar geometric patterns built on top of pivots. Deterministic,
 * tolerance-driven; no ML.
 */

import type { OHLCBar, SwingPoint } from "../market-structure/types";

export type ChartPatternId =
  | "double-top"
  | "double-bottom"
  | "triple-top"
  | "triple-bottom"
  | "head-and-shoulders"
  | "inverse-head-and-shoulders"
  | "ascending-triangle"
  | "descending-triangle"
  | "symmetrical-triangle"
  | "rising-wedge"
  | "falling-wedge"
  | "bull-flag"
  | "bear-flag";

export type ChartPatternBias = "bullish" | "bearish" | "neutral";

export interface ChartPattern {
  id: ChartPatternId;
  bias: ChartPatternBias;
  /** Bar index of the last pivot in the pattern. */
  index: number;
  time: number;
  /** Pivots that define the geometry. */
  pivots: SwingPoint[];
  /** Neckline / breakout level, when applicable. */
  level?: number;
  /** 0–1 confidence based on symmetry / tolerance fit. */
  strength: number;
}

export interface ChartPatternOptions {
  lookback?: number;
  /** Price equality tolerance (fraction). Defaults 0.01. */
  tolerance?: number;
}

export interface ChartPatternAnalysis {
  bars: number;
  patterns: ChartPattern[];
}

export type { OHLCBar };
