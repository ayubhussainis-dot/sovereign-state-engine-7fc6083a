/**
 * Order Block — Types
 *
 * An order block is the last opposing candle before a displacement move
 * that breaks structure. Bullish OB: last down-close candle before an
 * up-displacement. Bearish OB: last up-close candle before a
 * down-displacement.
 *
 * Deterministic, pure. No UI, no live data.
 */

import type { OHLCBar } from "../market-structure/types";

export type OrderBlockKind = "bullish" | "bearish";

export interface OrderBlock {
  kind: OrderBlockKind;
  /** Bar index of the origin candle (the opposing candle). */
  index: number;
  time: number;
  /** Range of the block — normally the origin candle's high/low. */
  high: number;
  low: number;
  /** Bar index where displacement was confirmed. */
  displacementIndex: number;
  /** Displacement magnitude as fraction of origin midpoint. */
  displacement: number;
  /** True once price has traded back into the block. */
  mitigated?: boolean;
  mitigatedAt?: number;
  mitigatedIndex?: number;
  /** True once price closes fully through the block, invalidating it. */
  invalidated?: boolean;
}

export interface OrderBlockOptions {
  /** Minimum displacement (fraction of origin mid) to qualify. Defaults 0.003 (30bps). */
  displacementThreshold?: number;
  /** How many bars after the origin to look for displacement. Defaults 3. */
  displacementWindow?: number;
  /** Track mitigation / invalidation across the whole series. Defaults true. */
  trackMitigation?: boolean;
}

export interface OrderBlockAnalysis {
  bars: number;
  blocks: OrderBlock[];
}

export type { OHLCBar };
