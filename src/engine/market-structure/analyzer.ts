import { detectPivots } from "./pivots";
import type {
  OHLCBar,
  StructureAnalysis,
  StructureBias,
  StructureEvent,
  StructureOptions,
  SwingPoint,
} from "./types";

/**
 * Analyze a series of OHLC bars and produce a structural annotation:
 * labeled pivots (HH/HL/LH/LL) plus BOS/CHoCH/MSS events.
 *
 * The algorithm is intentionally simple and deterministic:
 *  1. Detect fractal pivots.
 *  2. Label each pivot vs. the previous pivot of the same kind.
 *  3. Walk bars chronologically and track the last confirmed swing high
 *     and swing low as "protected" levels.
 *  4. When a bar closes beyond a protected level:
 *       - continuation of current bias → BOS
 *       - opposite of current bias      → CHoCH (bias flips)
 *  5. If the next bar shows displacement in the CHoCH direction, upgrade
 *     to MSS.
 */
export function analyzeStructure(
  bars: readonly OHLCBar[],
  options: StructureOptions = {},
): StructureAnalysis {
  const lookback = options.lookback ?? 2;
  const closeConfirmation = options.closeConfirmation ?? true;
  const displacementThreshold = options.displacementThreshold ?? 0.001;

  const rawPivots = detectPivots(bars, lookback);
  const pivots = labelPivots(rawPivots);

  const events: StructureEvent[] = [];
  let bias: StructureBias = "neutral";
  let lastProtectedHigh: SwingPoint | undefined;
  let lastProtectedLow: SwingPoint | undefined;

  // Pivots become "protected" only after their right-side confirmation
  // bars have closed — i.e. index + lookback.
  const readyAt = (p: SwingPoint) => p.index + lookback;
  let pivotCursor = 0;

  for (let i = 0; i < bars.length; i++) {
    // Promote any pivots that have become confirmed by bar i.
    while (
      pivotCursor < pivots.length &&
      readyAt(pivots[pivotCursor]) <= i
    ) {
      const p = pivots[pivotCursor++];
      if (p.kind === "high") lastProtectedHigh = p;
      else lastProtectedLow = p;
    }

    const bar = bars[i];
    const brokeHigh =
      lastProtectedHigh &&
      i > readyAt(lastProtectedHigh) &&
      (closeConfirmation
        ? bar.close > lastProtectedHigh.price
        : bar.high > lastProtectedHigh.price);
    const brokeLow =
      lastProtectedLow &&
      i > readyAt(lastProtectedLow) &&
      (closeConfirmation
        ? bar.close < lastProtectedLow.price
        : bar.low < lastProtectedLow.price);

    if (brokeHigh && lastProtectedHigh) {
      const previousBias = bias;
      const isContinuation = bias === "bullish";
      const kind = isContinuation ? "BOS" : "CHoCH";
      bias = "bullish";
      const event: StructureEvent = {
        kind,
        direction: "bullish",
        index: i,
        time: bar.time,
        level: lastProtectedHigh.price,
        reference: lastProtectedHigh,
        previousBias,
        newBias: bias,
      };
      events.push(maybeUpgradeToMSS(event, bars, displacementThreshold));
      // Consume this protected level so we don't fire again on it.
      lastProtectedHigh = undefined;
    }

    if (brokeLow && lastProtectedLow) {
      const previousBias = bias;
      const isContinuation = bias === "bearish";
      const kind = isContinuation ? "BOS" : "CHoCH";
      bias = "bearish";
      const event: StructureEvent = {
        kind,
        direction: "bearish",
        index: i,
        time: bar.time,
        level: lastProtectedLow.price,
        reference: lastProtectedLow,
        previousBias,
        newBias: bias,
      };
      events.push(maybeUpgradeToMSS(event, bars, displacementThreshold));
      lastProtectedLow = undefined;
    }
  }

  const lastHigh = [...pivots].reverse().find((p) => p.kind === "high");
  const lastLow = [...pivots].reverse().find((p) => p.kind === "low");

  return {
    bars: bars.length,
    pivots,
    events,
    bias,
    lastHigh,
    lastLow,
  };
}

function labelPivots(pivots: readonly SwingPoint[]): SwingPoint[] {
  let prevHigh: SwingPoint | undefined;
  let prevLow: SwingPoint | undefined;
  return pivots.map((p) => {
    if (p.kind === "high") {
      const label = prevHigh
        ? p.price > prevHigh.price
          ? "HH"
          : "LH"
        : undefined;
      prevHigh = p;
      return { ...p, label };
    }
    const label = prevLow
      ? p.price > prevLow.price
        ? "HL"
        : "LL"
      : undefined;
    prevLow = p;
    return { ...p, label };
  });
}

function maybeUpgradeToMSS(
  event: StructureEvent,
  bars: readonly OHLCBar[],
  threshold: number,
): StructureEvent {
  if (event.kind !== "CHoCH") return event;
  const next = bars[event.index + 1];
  if (!next) return event;
  const move =
    event.direction === "bullish"
      ? (next.close - event.level) / event.level
      : (event.level - next.close) / event.level;
  if (move >= threshold) {
    return { ...event, kind: "MSS" };
  }
  return event;
}
