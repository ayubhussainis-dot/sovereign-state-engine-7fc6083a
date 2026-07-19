/**
 * Liquidity — Types
 *
 * Buy-side / sell-side liquidity, equal highs/lows, and sweep detection
 * over OHLC bars. Deterministic, side-effect free, no UI.
 *
 * Vocabulary (Knowledge Foundation aligned):
 *  - BSL (Buy-Side Liquidity): resting stops ABOVE a high / cluster of highs.
 *  - SSL (Sell-Side Liquidity): resting stops BELOW a low / cluster of lows.
 *  - Equal Highs / Equal Lows: two+ pivots at ~the same price (within tolerance).
 *  - Liquidity Sweep: wick takes out a liquidity level then bar closes back inside.
 *  - Stop Hunt: sweep followed by an immediate opposite-direction impulse.
 */

import type { OHLCBar, SwingPoint } from "../market-structure/types";

export type LiquiditySide = "buy" | "sell";

export interface LiquidityPool {
  side: LiquiditySide;
  /** Price where stops are assumed to rest. */
  price: number;
  /** Pivots that formed the pool. */
  pivots: SwingPoint[];
  /** Marked "equal" when >= 2 pivots collapsed within tolerance. */
  equal: boolean;
  createdAt: number;
  /** True once a bar has traded through the level. */
  taken?: boolean;
  takenAt?: number;
  takenIndex?: number;
}

export type LiquidityEventKind = "sweep" | "stop-hunt";

export interface LiquidityEvent {
  kind: LiquidityEventKind;
  side: LiquiditySide;
  index: number;
  time: number;
  level: number;
  pool: LiquidityPool;
  /** For stop-hunts: the impulse magnitude as a fraction of the level. */
  reversalStrength?: number;
}

export interface LiquidityAnalysis {
  bars: number;
  pools: LiquidityPool[];
  events: LiquidityEvent[];
}

export interface LiquidityOptions {
  /** Fractal lookback for pivot detection. Defaults to 2. */
  lookback?: number;
  /** Tolerance for "equal" clustering, as fraction of price. Defaults to 0.0005 (5bps). */
  equalTolerance?: number;
  /** Bars to look forward for a stop-hunt reversal. Defaults to 3. */
  reversalWindow?: number;
  /** Minimum reversal move (fraction of level) to qualify as a stop hunt. Defaults to 0.001. */
  reversalThreshold?: number;
}

export type { OHLCBar };
