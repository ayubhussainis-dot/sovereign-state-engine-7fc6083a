import type { OHLCBar } from "../market-structure/types";
import type {
  OrderBlock,
  OrderBlockAnalysis,
  OrderBlockOptions,
} from "./types";

/**
 * Detect order blocks by scanning for a displacement move and marking the
 * last opposing candle before that move as the origin block.
 */
export function detectOrderBlocks(
  bars: readonly OHLCBar[],
  options: OrderBlockOptions = {},
): OrderBlockAnalysis {
  const threshold = options.displacementThreshold ?? 0.003;
  const window = options.displacementWindow ?? 3;
  const trackMitigation = options.trackMitigation ?? true;

  const blocks: OrderBlock[] = [];

  for (let i = 1; i < bars.length; i++) {
    const origin = bars[i];
    const isBearishBody = origin.close < origin.open;
    const isBullishBody = origin.close > origin.open;
    if (!isBearishBody && !isBullishBody) continue;

    const end = Math.min(bars.length - 1, i + window);
    const mid = (origin.high + origin.low) / 2;

    // Bullish OB: bearish origin candle followed by up-displacement.
    if (isBearishBody) {
      for (let j = i + 1; j <= end; j++) {
        const move = (bars[j].close - origin.high) / mid;
        if (move >= threshold) {
          blocks.push({
            kind: "bullish",
            index: i,
            time: origin.time,
            high: origin.high,
            low: origin.low,
            displacementIndex: j,
            displacement: move,
          });
          break;
        }
      }
    }

    // Bearish OB: bullish origin candle followed by down-displacement.
    if (isBullishBody) {
      for (let j = i + 1; j <= end; j++) {
        const move = (origin.low - bars[j].close) / mid;
        if (move >= threshold) {
          blocks.push({
            kind: "bearish",
            index: i,
            time: origin.time,
            high: origin.high,
            low: origin.low,
            displacementIndex: j,
            displacement: move,
          });
          break;
        }
      }
    }
  }

  if (trackMitigation) {
    for (const block of blocks) {
      for (let k = block.displacementIndex + 1; k < bars.length; k++) {
        const bar = bars[k];
        const touched = bar.low <= block.high && bar.high >= block.low;
        if (touched && !block.mitigated) {
          block.mitigated = true;
          block.mitigatedAt = bar.time;
          block.mitigatedIndex = k;
        }
        const invalid =
          block.kind === "bullish"
            ? bar.close < block.low
            : bar.close > block.high;
        if (invalid) {
          block.invalidated = true;
          break;
        }
      }
    }
  }

  return { bars: bars.length, blocks };
}
