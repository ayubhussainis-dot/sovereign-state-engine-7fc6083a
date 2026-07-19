/**
 * Candlestick Recognition — Types
 *
 * Detects canonical single- and multi-bar candlestick patterns.
 * Deterministic thresholds; no smoothing or ML.
 */

import type { OHLCBar } from "../market-structure/types";

export type CandlestickPatternId =
  | "doji"
  | "hammer"
  | "inverted-hammer"
  | "shooting-star"
  | "hanging-man"
  | "marubozu"
  | "spinning-top"
  | "bullish-engulfing"
  | "bearish-engulfing"
  | "piercing-line"
  | "dark-cloud-cover"
  | "morning-star"
  | "evening-star"
  | "three-white-soldiers"
  | "three-black-crows"
  | "inside-bar"
  | "outside-bar"
  | "tweezer-top"
  | "tweezer-bottom";

export type CandlestickBias = "bullish" | "bearish" | "neutral";

export interface CandlestickPattern {
  id: CandlestickPatternId;
  bias: CandlestickBias;
  /** Bar index where the pattern completes. */
  index: number;
  time: number;
  /** How many bars back the pattern started (0 for single-bar). */
  span: number;
  /** 0–1 confidence based on body/range ratios. */
  strength: number;
}

export interface CandlestickOptions {
  /** Max body/range ratio for a doji. Defaults 0.1. */
  dojiRatio?: number;
  /** Min lower/upper wick ratio for hammer / shooting star. Defaults 2. */
  wickRatio?: number;
  /** Body/range threshold for marubozu. Defaults 0.9. */
  marubozuRatio?: number;
  /** Price tolerance for tweezers. Defaults 0.001. */
  tweezerTolerance?: number;
}

export interface CandlestickAnalysis {
  bars: number;
  patterns: CandlestickPattern[];
}

export type { OHLCBar };
