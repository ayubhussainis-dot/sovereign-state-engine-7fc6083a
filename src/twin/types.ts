/**
 * Market Digital Twin — Types
 *
 * The Twin is the authoritative internal representation of the market.
 *
 * Every observed live event is normalized into a TwinTick before
 * downstream modules such as PPG, SOALL and RiskAuthority inspect it.
 *
 * Determinism:
 *   - No wall-clock reads inside the Twin.
 *   - All timestamps are supplied by the feed/ingress caller.
 *   - Replay can therefore reproduce the same downstream state.
 *
 * Timing model:
 *   ts         = source/feed event timestamp.
 *   receivedAt = local receipt timestamp supplied by ingress.
 *
 * IMPORTANT:
 *   receivedAt - ts is a timestamp difference, not guaranteed to be
 *   pure network latency because the source and local clocks may have
 *   an offset.
 */

export type TwinSide =
  | "buy"
  | "sell"
  | "unknown";

export interface LiveTick {
  /**
   * Source/feed event timestamp in milliseconds.
   */
  ts: number;

  /**
   * Monotonic sequence supplied by the source when available.
   */
  seq?: number;

  /**
   * Trade/market price.
   */
  price: number;

  /**
   * Source-reported volume.
   */
  volume: number;

  /**
   * Source-reported direction when available.
   */
  side?: TwinSide;

  /**
   * Best bid when available.
   */
  bid?: number;

  /**
   * Best ask when available.
   */
  ask?: number;

  /**
   * Local receipt timestamp in milliseconds.
   *
   * This must be supplied by the feed adapter/ingress caller.
   * The Twin itself does not read the wall clock.
   */
  receivedAt: number;
}

export interface TwinTick {
  /**
   * Monotonic sequence assigned by the Twin ingress.
   *
   * The Twin owns this sequence.
   */
  twinSeq: number;

  /**
   * Original source timestamp preserved verbatim.
   */
  ts: number;

  /**
   * Local receipt timestamp preserved verbatim.
   */
  receivedAt: number;

  /**
   * Market price.
   */
  price: number;

  /**
   * Market volume.
   */
  volume: number;

  /**
   * Normalized market side.
   */
  side: TwinSide;

  /**
   * Best bid at observation time.
   */
  bid: number | null;

  /**
   * Best ask at observation time.
   */
  ask: number | null;

  /**
   * Absolute difference between source timestamp and
   * local receipt timestamp.
   *
   * This is a timing-difference diagnostic.
   * It is NOT guaranteed to represent pure network latency
   * unless the source and local clocks share a calibrated basis.
   */
  latencyMs: number;
}

export interface TwinSnapshot {
  /**
   * Most recent normalized tick.
   */
  last: TwinTick | null;

  /**
   * Rolling Twin window.
   */
  window: readonly TwinTick[];

  /**
   * Best-known bid from the current window.
   */
  bid: number | null;

  /**
   * Best-known ask from the current window.
   */
  ask: number | null;

  /**
   * Aggregated buy volume in the current window.
   */
  buyVolume: number;

  /**
   * Aggregated sell volume in the current window.
   */
  sellVolume: number;
}

export interface MirrorReport {
  /**
   * Absolute difference between Twin price and
   * the compared live price.
   */
  priceDrift: number;

  /**
   * Absolute timestamp difference between the source
   * event and local receipt.
   *
   * This is a timing diagnostic, not guaranteed pure
   * network latency.
   */
  latencyMs: number;

  /**
   * Twin sequence of the compared observation.
   */
  twinSeq: number;
}
