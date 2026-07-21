/**
 * Market Digital Twin — Types
 *
 * The Twin is the authoritative internal representation of the market.
 * Every observed live event is normalized into a `TwinTick` before any
 * downstream module (PPG, SOALL, RiskAuthority) may inspect it.
 *
 * Determinism: no wall-clock reads. All time values come from the
 * caller (ingress) so replay against a recorded tape yields identical
 * downstream outputs.
 */

export type TwinSide = "buy" | "sell" | "unknown";

export interface LiveTick {
  /** Millisecond timestamp as reported by the source feed. */
  ts: number;
  /** Monotonic sequence number from the source, if available. */
  seq?: number;
  price: number;
  volume: number;
  side?: TwinSide;
  bid?: number;
  ask?: number;
  /** Millisecond timestamp of local receipt (supplied by ingress caller). */
  receivedAt: number;
}

export interface TwinTick {
  /** Monotonic twin sequence — assigned by ingress, never gaps. */
  twinSeq: number;
  /** Source timestamp preserved verbatim. */
  ts: number;
  /** Local receipt timestamp preserved verbatim. */
  receivedAt: number;
  price: number;
  volume: number;
  side: TwinSide;
  bid: number | null;
  ask: number | null;
  /** ts - receivedAt; negative = source ahead of local clock. */
  latencyMs: number;
}

export interface TwinSnapshot {
  /** Most recent tick, if any. */
  last: TwinTick | null;
  /** Rolling window of recent ticks; caller decides capacity. */
  window: readonly TwinTick[];
  /** Best-known bid/ask distilled from the window. */
  bid: number | null;
  ask: number | null;
  /** Aggregated buy/sell volume within the window. */
  buyVolume: number;
  sellVolume: number;
}

export interface MirrorReport {
  /** |twinPrice - livePrice| */
  priceDrift: number;
  /** receivedAt - ts (positive = local behind source). */
  latencyMs: number;
  /** twinSeq of the compared tick. */
  twinSeq: number;
}