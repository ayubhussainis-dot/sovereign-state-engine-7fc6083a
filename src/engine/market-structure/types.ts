/**
 * Market Structure — Types
 *
 * Pure, deterministic definitions for market-structure analysis. No live
 * data, no fake data, no UI coupling. Consumers feed OHLC bars in and
 * receive structural annotations back.
 *
 * Vocabulary (aligned with the Knowledge Foundation):
 *  - Swing High / Swing Low: fractal pivots detected from bar geometry.
 *  - HH / HL / LH / LL: relative labeling of successive same-type pivots.
 *  - BOS (Break of Structure): trend-continuation break of the last
 *    protected pivot in the direction of the prevailing trend.
 *  - CHoCH (Change of Character): the FIRST break against the prevailing
 *    trend — signals a potential regime shift.
 *  - MSS (Market Structure Shift): a confirmed CHoCH followed by
 *    displacement in the new direction (a stronger signal than CHoCH).
 */

export interface OHLCBar {
  /** Epoch milliseconds. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type PivotKind = "high" | "low";

/** Relative labels for successive pivots of the same kind. */
export type SwingLabel = "HH" | "HL" | "LH" | "LL";

export interface SwingPoint {
  /** Index into the bar array that was analyzed. */
  index: number;
  time: number;
  price: number;
  kind: PivotKind;
  /** Relative label vs. the previous pivot of the same kind. */
  label?: SwingLabel;
  /**
   * Left/right strength — how many bars on each side this pivot dominates.
   * Equal to the `lookback` used by the detector unless clamped at edges.
   */
  strength: number;
}

export type StructureBias = "bullish" | "bearish" | "neutral";

export type StructureEventKind = "BOS" | "CHoCH" | "MSS";

export interface StructureEvent {
  kind: StructureEventKind;
  /** Direction of the break (the market's new intent). */
  direction: "bullish" | "bearish";
  /** Bar index where the break was confirmed (close through level). */
  index: number;
  time: number;
  /** Price level that was broken (the reference pivot). */
  level: number;
  /** The pivot that defined `level`. */
  reference: SwingPoint;
  /**
   * Bias BEFORE the event. BOS keeps bias; CHoCH/MSS flip it.
   */
  previousBias: StructureBias;
  /** Bias AFTER the event. */
  newBias: StructureBias;
}

export interface StructureAnalysis {
  bars: number;
  pivots: SwingPoint[];
  events: StructureEvent[];
  /** Final bias after processing every bar. */
  bias: StructureBias;
  /** Most recent confirmed HH / HL / LH / LL for quick access. */
  lastHigh?: SwingPoint;
  lastLow?: SwingPoint;
}

export interface StructureOptions {
  /**
   * Fractal lookback on each side. A bar is a swing high if its high is
   * strictly greater than the highs of the `lookback` bars on each side
   * (mirror for swing lows). Defaults to 2 (classic Williams fractal).
   */
  lookback?: number;
  /**
   * Require a full-body close beyond the level to confirm BOS/CHoCH.
   * When false, a wick through the level is enough. Defaults to true.
   */
  closeConfirmation?: boolean;
  /**
   * Minimum displacement (as a fraction of the broken level) required to
   * upgrade a CHoCH into an MSS on the next bar. Defaults to 0.001 (10bps).
   */
  displacementThreshold?: number;
}
