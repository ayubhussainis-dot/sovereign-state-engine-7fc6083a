import { detectPivots } from "../market-structure/pivots";
import type { OHLCBar, SwingPoint } from "../market-structure/types";
import type {
  ChartPattern,
  ChartPatternAnalysis,
  ChartPatternOptions,
} from "./types";

const approxEq = (a: number, b: number, tol: number) =>
  Math.abs(a - b) / ((a + b) / 2) <= tol;

export function detectChartPatterns(
  bars: readonly OHLCBar[],
  options: ChartPatternOptions = {},
): ChartPatternAnalysis {
  const lookback = options.lookback ?? 3;
  const tol = options.tolerance ?? 0.01;

  const pivots = detectPivots(bars, lookback);
  const highs = pivots.filter((p) => p.kind === "high");
  const lows = pivots.filter((p) => p.kind === "low");
  const patterns: ChartPattern[] = [];

  // Double / triple tops (two or three highs at ~same price)
  for (let i = 1; i < highs.length; i++) {
    const a = highs[i - 1];
    const b = highs[i];
    if (approxEq(a.price, b.price, tol)) {
      const neckLow = lows.find((l) => l.index > a.index && l.index < b.index);
      patterns.push({
        id: "double-top",
        bias: "bearish",
        index: b.index,
        time: b.time,
        pivots: [a, b],
        level: neckLow?.price,
        strength: 1 - Math.abs(a.price - b.price) / a.price / tol,
      });
    }
    if (i >= 2) {
      const c = highs[i - 2];
      if (approxEq(a.price, b.price, tol) && approxEq(b.price, c.price, tol)) {
        patterns.push({
          id: "triple-top",
          bias: "bearish",
          index: b.index,
          time: b.time,
          pivots: [c, a, b],
          strength: 0.85,
        });
      }
    }
  }
  for (let i = 1; i < lows.length; i++) {
    const a = lows[i - 1];
    const b = lows[i];
    if (approxEq(a.price, b.price, tol)) {
      const neckHigh = highs.find((h) => h.index > a.index && h.index < b.index);
      patterns.push({
        id: "double-bottom",
        bias: "bullish",
        index: b.index,
        time: b.time,
        pivots: [a, b],
        level: neckHigh?.price,
        strength: 1 - Math.abs(a.price - b.price) / a.price / tol,
      });
    }
    if (i >= 2) {
      const c = lows[i - 2];
      if (approxEq(a.price, b.price, tol) && approxEq(b.price, c.price, tol)) {
        patterns.push({
          id: "triple-bottom",
          bias: "bullish",
          index: b.index,
          time: b.time,
          pivots: [c, a, b],
          strength: 0.85,
        });
      }
    }
  }

  // Head & shoulders: 3 successive highs where middle is highest and outer two are ~equal
  for (let i = 2; i < highs.length; i++) {
    const l = highs[i - 2];
    const h = highs[i - 1];
    const r = highs[i];
    if (h.price > l.price && h.price > r.price && approxEq(l.price, r.price, tol * 2)) {
      const trough1 = lows.find((x) => x.index > l.index && x.index < h.index);
      const trough2 = lows.find((x) => x.index > h.index && x.index < r.index);
      const neck = trough1 && trough2 ? (trough1.price + trough2.price) / 2 : undefined;
      patterns.push({
        id: "head-and-shoulders",
        bias: "bearish",
        index: r.index,
        time: r.time,
        pivots: [l, h, r],
        level: neck,
        strength: 0.8,
      });
    }
  }
  for (let i = 2; i < lows.length; i++) {
    const l = lows[i - 2];
    const h = lows[i - 1];
    const r = lows[i];
    if (h.price < l.price && h.price < r.price && approxEq(l.price, r.price, tol * 2)) {
      const peak1 = highs.find((x) => x.index > l.index && x.index < h.index);
      const peak2 = highs.find((x) => x.index > h.index && x.index < r.index);
      const neck = peak1 && peak2 ? (peak1.price + peak2.price) / 2 : undefined;
      patterns.push({
        id: "inverse-head-and-shoulders",
        bias: "bullish",
        index: r.index,
        time: r.time,
        pivots: [l, h, r],
        level: neck,
        strength: 0.8,
      });
    }
  }

  // Triangles & wedges via trendline slopes over last N highs/lows
  const recentHighs = highs.slice(-4);
  const recentLows = lows.slice(-4);
  if (recentHighs.length >= 2 && recentLows.length >= 2) {
    const hs = slope(recentHighs);
    const ls = slope(recentLows);
    const last = pivots[pivots.length - 1];
    if (last) {
      if (Math.abs(hs) < 1e-6 && ls > 0) {
        patterns.push({ id: "ascending-triangle", bias: "bullish", index: last.index, time: last.time, pivots: [...recentHighs, ...recentLows], strength: 0.7 });
      } else if (hs < 0 && Math.abs(ls) < 1e-6) {
        patterns.push({ id: "descending-triangle", bias: "bearish", index: last.index, time: last.time, pivots: [...recentHighs, ...recentLows], strength: 0.7 });
      } else if (hs < 0 && ls > 0) {
        patterns.push({ id: "symmetrical-triangle", bias: "neutral", index: last.index, time: last.time, pivots: [...recentHighs, ...recentLows], strength: 0.6 });
      } else if (hs > 0 && ls > 0 && hs < ls) {
        patterns.push({ id: "rising-wedge", bias: "bearish", index: last.index, time: last.time, pivots: [...recentHighs, ...recentLows], strength: 0.6 });
      } else if (hs < 0 && ls < 0 && ls < hs) {
        patterns.push({ id: "falling-wedge", bias: "bullish", index: last.index, time: last.time, pivots: [...recentHighs, ...recentLows], strength: 0.6 });
      }
    }
  }

  // Flags: sharp impulse (pole) then tight parallel consolidation
  if (bars.length > 20 && recentHighs.length >= 2 && recentLows.length >= 2) {
    const hs = slope(recentHighs);
    const ls = slope(recentLows);
    const poleWindow = bars.slice(-20, -8);
    const poleChange = poleWindow.length
      ? (poleWindow[poleWindow.length - 1].close - poleWindow[0].close) / poleWindow[0].close
      : 0;
    const last = pivots[pivots.length - 1];
    if (last) {
      if (poleChange > 0.05 && hs < 0 && ls < 0 && Math.abs(hs - ls) / Math.abs(ls) < 0.3) {
        patterns.push({ id: "bull-flag", bias: "bullish", index: last.index, time: last.time, pivots: [...recentHighs, ...recentLows], strength: 0.7 });
      }
      if (poleChange < -0.05 && hs > 0 && ls > 0 && Math.abs(hs - ls) / Math.abs(ls) < 0.3) {
        patterns.push({ id: "bear-flag", bias: "bearish", index: last.index, time: last.time, pivots: [...recentHighs, ...recentLows], strength: 0.7 });
      }
    }
  }

  return { bars: bars.length, patterns };
}

function slope(points: readonly SwingPoint[]): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const sx = points.reduce((s, p) => s + p.index, 0);
  const sy = points.reduce((s, p) => s + p.price, 0);
  const sxy = points.reduce((s, p) => s + p.index * p.price, 0);
  const sxx = points.reduce((s, p) => s + p.index * p.index, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  return (n * sxy - sx * sy) / denom;
}
