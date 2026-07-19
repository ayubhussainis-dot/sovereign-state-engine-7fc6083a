/**
 * Multi-Timeframe Confluence Engine — Types
 *
 * Aggregates directional bias, structural events, liquidity, order
 * blocks, FVGs, and pattern signals across multiple timeframes into a
 * single confluence score.
 */

import type { CandlestickAnalysis } from "../candlestick/types";
import type { ChartPatternAnalysis } from "../chart-pattern/types";
import type { FVGAnalysis } from "../fair-value-gap/types";
import type { LiquidityAnalysis } from "../liquidity/types";
import type { StructureAnalysis } from "../market-structure/types";
import type { OrderBlockAnalysis } from "../order-block/types";

export type MTFTimeframe =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w";

export interface MTFSnapshot {
  timeframe: MTFTimeframe;
  structure: StructureAnalysis;
  liquidity?: LiquidityAnalysis;
  orderBlocks?: OrderBlockAnalysis;
  fvgs?: FVGAnalysis;
  candlesticks?: CandlestickAnalysis;
  chartPatterns?: ChartPatternAnalysis;
}

export type MTFBias = "long" | "short" | "flat";

export interface MTFBiasBreakdown {
  timeframe: MTFTimeframe;
  bias: MTFBias;
  score: number;
  contributions: { source: string; weight: number }[];
}

export interface MTFConfluenceResult {
  bias: MTFBias;
  score: number;
  confidence: number;
  aligned: boolean;
  breakdown: MTFBiasBreakdown[];
}

export interface MTFConfluenceOptions {
  /** Higher timeframes weigh more when summing bias. */
  weights?: Partial<Record<MTFTimeframe, number>>;
  /** Minimum absolute score for a directional bias. Defaults 0.25. */
  minScore?: number;
}
