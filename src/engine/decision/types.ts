/**
 * AI Decision Engine — Types
 *
 * Deterministic decision layer that fuses signals from the structural
 * engines (market structure, liquidity, order blocks, FVGs, candlesticks,
 * chart patterns) into a scored trade thesis. Explanations are
 * structured so a future LLM layer can narrate them, but the core
 * scoring is transparent and testable.
 *
 * No trade execution, no live provider calls. Pure functions in, pure
 * decisions out.
 */

import type { CandlestickPattern } from "../candlestick/types";
import type { ChartPattern } from "../chart-pattern/types";
import type { FairValueGap } from "../fair-value-gap/types";
import type { LiquidityAnalysis } from "../liquidity/types";
import type { OHLCBar, StructureAnalysis } from "../market-structure/types";
import type { OrderBlock } from "../order-block/types";

export type DecisionBias = "long" | "short" | "flat";

export interface DecisionInputs {
  symbol: string;
  bars: readonly OHLCBar[];
  structure: StructureAnalysis;
  liquidity?: LiquidityAnalysis;
  orderBlocks?: readonly OrderBlock[];
  fvgs?: readonly FairValueGap[];
  candlesticks?: readonly CandlestickPattern[];
  chartPatterns?: readonly ChartPattern[];
}

export interface DecisionSignal {
  source:
    | "structure"
    | "liquidity"
    | "order-block"
    | "fvg"
    | "candlestick"
    | "chart-pattern";
  bias: "bullish" | "bearish" | "neutral";
  /** -1..1 signed weight after the signal is applied. */
  weight: number;
  reason: string;
}

export interface DecisionPlan {
  entry: number;
  stop: number;
  targets: number[];
  rr: number;
}

export interface Decision {
  symbol: string;
  bias: DecisionBias;
  /** 0–1 confidence normalized across contributing signals. */
  confidence: number;
  score: number;
  signals: DecisionSignal[];
  plan?: DecisionPlan;
  /** Human-readable narrative built from signals. */
  rationale: string;
  createdAt: number;
}

export interface DecisionOptions {
  /** Minimum confidence to emit a directional bias. Defaults 0.35. */
  minConfidence?: number;
  /** Reward:risk target for the primary target. Defaults 2. */
  targetRR?: number;
  /** Weights per source; defaults balanced. */
  weights?: Partial<Record<DecisionSignal["source"], number>>;
}
