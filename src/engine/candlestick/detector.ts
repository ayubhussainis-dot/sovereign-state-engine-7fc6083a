import type { OHLCBar } from "../market-structure/types";
import type {
  CandlestickAnalysis,
  CandlestickOptions,
  CandlestickPattern,
} from "./types";

interface Metrics {
  body: number;
  range: number;
  upper: number;
  lower: number;
  bullish: boolean;
  bearish: boolean;
  bodyRatio: number;
}

function metrics(bar: OHLCBar): Metrics {
  const body = Math.abs(bar.close - bar.open);
  const range = bar.high - bar.low || 1e-9;
  const upper = bar.high - Math.max(bar.open, bar.close);
  const lower = Math.min(bar.open, bar.close) - bar.low;
  return {
    body,
    range,
    upper,
    lower,
    bullish: bar.close > bar.open,
    bearish: bar.close < bar.open,
    bodyRatio: body / range,
  };
}

export function detectCandlestickPatterns(
  bars: readonly OHLCBar[],
  options: CandlestickOptions = {},
): CandlestickAnalysis {
  const dojiRatio = options.dojiRatio ?? 0.1;
  const wickRatio = options.wickRatio ?? 2;
  const marubozuRatio = options.marubozuRatio ?? 0.9;
  const tweezerTol = options.tweezerTolerance ?? 0.001;

  const patterns: CandlestickPattern[] = [];
  const M = bars.map(metrics);

  const push = (p: CandlestickPattern) => patterns.push(p);

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const m = M[i];

    // Doji
    if (m.bodyRatio <= dojiRatio) {
      push({ id: "doji", bias: "neutral", index: i, time: b.time, span: 0, strength: 1 - m.bodyRatio });
    }
    // Marubozu
    if (m.bodyRatio >= marubozuRatio) {
      push({
        id: "marubozu",
        bias: m.bullish ? "bullish" : "bearish",
        index: i,
        time: b.time,
        span: 0,
        strength: m.bodyRatio,
      });
    }
    // Spinning top: small body, wicks on both sides
    if (m.bodyRatio > dojiRatio && m.bodyRatio < 0.35 && m.upper > m.body && m.lower > m.body) {
      push({ id: "spinning-top", bias: "neutral", index: i, time: b.time, span: 0, strength: 1 - m.bodyRatio });
    }
    // Hammer / hanging man
    if (m.lower >= wickRatio * m.body && m.upper <= m.body) {
      push({ id: "hammer", bias: "bullish", index: i, time: b.time, span: 0, strength: m.lower / m.range });
      push({ id: "hanging-man", bias: "bearish", index: i, time: b.time, span: 0, strength: m.lower / m.range });
    }
    // Inverted hammer / shooting star
    if (m.upper >= wickRatio * m.body && m.lower <= m.body) {
      push({ id: "inverted-hammer", bias: "bullish", index: i, time: b.time, span: 0, strength: m.upper / m.range });
      push({ id: "shooting-star", bias: "bearish", index: i, time: b.time, span: 0, strength: m.upper / m.range });
    }

    if (i >= 1) {
      const p = bars[i - 1];
      const mp = M[i - 1];
      // Inside / outside bar
      if (b.high <= p.high && b.low >= p.low) {
        push({ id: "inside-bar", bias: "neutral", index: i, time: b.time, span: 1, strength: 1 });
      }
      if (b.high > p.high && b.low < p.low) {
        push({ id: "outside-bar", bias: m.bullish ? "bullish" : "bearish", index: i, time: b.time, span: 1, strength: 1 });
      }
      // Bullish / bearish engulfing (body engulfs prior body)
      if (mp.bearish && m.bullish && b.close >= p.open && b.open <= p.close) {
        push({ id: "bullish-engulfing", bias: "bullish", index: i, time: b.time, span: 1, strength: Math.min(1, m.body / mp.body) });
      }
      if (mp.bullish && m.bearish && b.open >= p.close && b.close <= p.open) {
        push({ id: "bearish-engulfing", bias: "bearish", index: i, time: b.time, span: 1, strength: Math.min(1, m.body / mp.body) });
      }
      // Piercing / dark cloud (close past midpoint of prior body)
      const priorMid = (p.open + p.close) / 2;
      if (mp.bearish && m.bullish && b.open < p.low && b.close > priorMid && b.close < p.open) {
        push({ id: "piercing-line", bias: "bullish", index: i, time: b.time, span: 1, strength: 0.7 });
      }
      if (mp.bullish && m.bearish && b.open > p.high && b.close < priorMid && b.close > p.open) {
        push({ id: "dark-cloud-cover", bias: "bearish", index: i, time: b.time, span: 1, strength: 0.7 });
      }
      // Tweezers
      if (Math.abs(b.high - p.high) / p.high <= tweezerTol && mp.bullish && m.bearish) {
        push({ id: "tweezer-top", bias: "bearish", index: i, time: b.time, span: 1, strength: 0.6 });
      }
      if (Math.abs(b.low - p.low) / p.low <= tweezerTol && mp.bearish && m.bullish) {
        push({ id: "tweezer-bottom", bias: "bullish", index: i, time: b.time, span: 1, strength: 0.6 });
      }
    }

    if (i >= 2) {
      const a = bars[i - 2];
      const c = bars[i - 1];
      const ma = M[i - 2];
      const mc = M[i - 1];
      // Morning star: down, small body, up closing past midpoint of first
      const midA = (a.open + a.close) / 2;
      if (ma.bearish && mc.bodyRatio < 0.4 && m.bullish && b.close > midA) {
        push({ id: "morning-star", bias: "bullish", index: i, time: b.time, span: 2, strength: 0.8 });
      }
      if (ma.bullish && mc.bodyRatio < 0.4 && m.bearish && b.close < midA) {
        push({ id: "evening-star", bias: "bearish", index: i, time: b.time, span: 2, strength: 0.8 });
      }
      // Three white soldiers / three black crows
      if (ma.bullish && mc.bullish && m.bullish && c.close > a.close && b.close > c.close) {
        push({ id: "three-white-soldiers", bias: "bullish", index: i, time: b.time, span: 2, strength: 0.85 });
      }
      if (ma.bearish && mc.bearish && m.bearish && c.close < a.close && b.close < c.close) {
        push({ id: "three-black-crows", bias: "bearish", index: i, time: b.time, span: 2, strength: 0.85 });
      }
    }
  }

  return { bars: bars.length, patterns };
}
