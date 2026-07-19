import type { OHLCBar, SwingPoint } from "./types";

/**
 * Fractal pivot detection.
 *
 * A bar at index `i` is a swing high when its high is strictly greater
 * than the highs of the `lookback` bars on each side. Swing lows mirror
 * the definition. Edge bars are skipped because they cannot be confirmed.
 *
 * Deterministic and side-effect free.
 */
export function detectPivots(
  bars: readonly OHLCBar[],
  lookback = 2,
): SwingPoint[] {
  const k = Math.max(1, Math.floor(lookback));
  const pivots: SwingPoint[] = [];
  if (bars.length < k * 2 + 1) return pivots;

  for (let i = k; i < bars.length - k; i++) {
    const bar = bars[i];
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= k; j++) {
      const left = bars[i - j];
      const right = bars[i + j];
      if (!(bar.high > left.high && bar.high > right.high)) isHigh = false;
      if (!(bar.low < left.low && bar.low < right.low)) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) {
      pivots.push({
        index: i,
        time: bar.time,
        price: bar.high,
        kind: "high",
        strength: k,
      });
    }
    if (isLow) {
      pivots.push({
        index: i,
        time: bar.time,
        price: bar.low,
        kind: "low",
        strength: k,
      });
    }
  }

  return pivots;
}
