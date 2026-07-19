/**
 * Confluence Scanner — Types
 *
 * Runs every structural detector across a batch of symbols and emits a
 * ranked list of candidates where multiple confluences agree.
 */

import type { CandlestickAnalysis } from "../candlestick/types";
import type { ChartPatternAnalysis } from "../chart-pattern/types";
import type { FVGAnalysis } from "../fair-value-gap/types";
import type { LiquidityAnalysis } from "../liquidity/types";
import type { OHLCBar, StructureAnalysis } from "../market-structure/types";
import type { OrderBlockAnalysis } from "../order-block/types";
import type { ConfidenceResult } from "../confidence/types";

export interface ScannerInputSymbol {
  symbol: string;
  bars: readonly OHLCBar[];
}

export type ConfluenceBias = "long" | "short" | "flat";

export interface ConfluenceHit {
  id: string;
  label: string;
  bias: "bullish" | "bearish" | "neutral";
  weight: number;
}

export interface ConfluenceCandidate {
  symbol: string;
  bias: ConfluenceBias;
  score: number;
  confidence: ConfidenceResult;
  hits: ConfluenceHit[];
  structure: StructureAnalysis;
  liquidity: LiquidityAnalysis;
  orderBlocks: OrderBlockAnalysis;
  fvgs: FVGAnalysis;
  candlesticks: CandlestickAnalysis;
  chartPatterns: ChartPatternAnalysis;
}

export interface ConfluenceScanOptions {
  /** Minimum score to include in results. Defaults 0.35. */
  minScore?: number;
  /** Directional filter. */
  bias?: ConfluenceBias;
  /** Maximum candidates returned (top-N by score). */
  limit?: number;
}

export interface ConfluenceScanResult {
  scanned: number;
  candidates: ConfluenceCandidate[];
}
