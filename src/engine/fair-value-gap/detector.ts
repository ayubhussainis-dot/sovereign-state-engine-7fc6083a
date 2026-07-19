import type { OHLCBar } from "../market-structure/types";
import type { FVGAnalysis, FVGOptions, FairValueGap } from "./types";

export function detectFairValueGaps(
  bars: readonly OHLCBar[],
  options: FVGOptions = {},
): FVGAnalysis {
  const minSize = options.minSize ?? 0;
  const trackFill = options.trackFill ?? true;
  const gaps: FairValueGap[] = [];

  for (let i = 1; i < bars.length - 1; i++) {
    const prev = bars[i - 1];
    const next = bars[i + 1];
    const mid = bars[i]
      ? (bars[i].high + bars[i].low) / 2
      : (prev.high + next.low) / 2;

    if (next.low > prev.high) {
      const size = (next.low - prev.high) / mid;
      if (size >= minSize) {
        gaps.push({
          kind: "bullish",
          index: i,
          time: bars[i].time,
          top: next.low,
          bottom: prev.high,
          size,
        });
      }
    } else if (next.high < prev.low) {
      const size = (prev.low - next.high) / mid;
      if (size >= minSize) {
        gaps.push({
          kind: "bearish",
          index: i,
          time: bars[i].time,
          top: prev.low,
          bottom: next.high,
          size,
        });
      }
    }
  }

  if (trackFill) {
    for (const gap of gaps) {
      for (let k = gap.index + 2; k < bars.length; k++) {
        const bar = bars[k];
        const touched = bar.low <= gap.top && bar.high >= gap.bottom;
        if (touched && !gap.filled) {
          gap.filled = true;
          gap.filledAt = bar.time;
          gap.filledIndex = k;
        }
        const invalid =
          gap.kind === "bullish"
            ? bar.close < gap.bottom
            : bar.close > gap.top;
        if (invalid) {
          gap.invalidated = true;
          break;
        }
      }
    }
  }

  return { bars: bars.length, gaps };
}
