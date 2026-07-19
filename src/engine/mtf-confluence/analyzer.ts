import type {
  MTFBias,
  MTFBiasBreakdown,
  MTFConfluenceOptions,
  MTFConfluenceResult,
  MTFSnapshot,
  MTFTimeframe,
} from "./types";

const DEFAULT_WEIGHTS: Record<MTFTimeframe, number> = {
  "1m": 0.2,
  "5m": 0.4,
  "15m": 0.6,
  "30m": 0.8,
  "1h": 1.0,
  "4h": 1.6,
  "1d": 2.4,
  "1w": 3.2,
};

/**
 * Combine per-timeframe snapshots into a single confluence bias/score.
 * Score range roughly [-1, 1]; confidence is |score| normalized.
 */
export function analyzeMTFConfluence(
  snapshots: readonly MTFSnapshot[],
  options: MTFConfluenceOptions = {},
): MTFConfluenceResult {
  const minScore = options.minScore ?? 0.25;
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights ?? {}) };

  const breakdown: MTFBiasBreakdown[] = snapshots.map((snap) => scoreSnapshot(snap));

  let weighted = 0;
  let totalWeight = 0;
  for (const b of breakdown) {
    const w = weights[b.timeframe] ?? 1;
    weighted += b.score * w;
    totalWeight += w;
  }
  const score = totalWeight === 0 ? 0 : weighted / totalWeight;

  const bias: MTFBias = score > minScore ? "long" : score < -minScore ? "short" : "flat";

  const dirs = breakdown.map((b) => b.bias).filter((b) => b !== "flat");
  const aligned = dirs.length > 0 && dirs.every((b) => b === dirs[0]);

  return {
    bias,
    score,
    confidence: Math.min(1, Math.abs(score)),
    aligned,
    breakdown,
  };
}

function scoreSnapshot(snap: MTFSnapshot): MTFBiasBreakdown {
  const contributions: { source: string; weight: number }[] = [];
  let score = 0;

  const bias = snap.structure.bias;
  const strucW = bias === "bullish" ? 0.4 : bias === "bearish" ? -0.4 : 0;
  score += strucW;
  contributions.push({ source: "structure", weight: strucW });

  const lastEvent = snap.structure.events[snap.structure.events.length - 1];
  if (lastEvent) {
    const evW = lastEvent.direction === "bullish" ? 0.2 : -0.2;
    score += evW;
    contributions.push({ source: `structure:${lastEvent.kind}`, weight: evW });
  }

  const sweeps = snap.liquidity?.events ?? [];
  const recentSweep = sweeps[sweeps.length - 1];
  if (recentSweep) {
    // Buy-side sweep flushes above → often precedes short move.
    const swW = recentSweep.side === "buy" ? -0.15 : 0.15;
    score += swW;
    contributions.push({ source: `liquidity:${recentSweep.kind}`, weight: swW });
  }

  const obs = snap.orderBlocks?.blocks ?? [];
  const bull = obs.filter((b) => b.kind === "bullish" && !b.invalidated).length;
  const bear = obs.filter((b) => b.kind === "bearish" && !b.invalidated).length;
  if (bull || bear) {
    const obW = ((bull - bear) / Math.max(1, bull + bear)) * 0.15;
    score += obW;
    contributions.push({ source: "order-block", weight: obW });
  }

  const fvgs = snap.fvgs?.gaps ?? [];
  const bullFvg = fvgs.filter((g) => g.kind === "bullish" && !g.filled).length;
  const bearFvg = fvgs.filter((g) => g.kind === "bearish" && !g.filled).length;
  if (bullFvg || bearFvg) {
    const fvgW = ((bullFvg - bearFvg) / Math.max(1, bullFvg + bearFvg)) * 0.1;
    score += fvgW;
    contributions.push({ source: "fvg", weight: fvgW });
  }

  const patterns = snap.chartPatterns?.patterns ?? [];
  const lastPattern = patterns[patterns.length - 1];
  if (lastPattern) {
    const pW = lastPattern.bias === "bullish" ? 0.1 : lastPattern.bias === "bearish" ? -0.1 : 0;
    score += pW;
    contributions.push({ source: `pattern:${lastPattern.id}`, weight: pW });
  }

  const candles = snap.candlesticks?.patterns ?? [];
  const lastCandle = candles[candles.length - 1];
  if (lastCandle) {
    const cW = lastCandle.bias === "bullish" ? 0.05 : lastCandle.bias === "bearish" ? -0.05 : 0;
    score += cW;
    contributions.push({ source: `candle:${lastCandle.id}`, weight: cW });
  }

  const clamped = Math.max(-1, Math.min(1, score));
  return {
    timeframe: snap.timeframe,
    bias: clamped > 0.15 ? "long" : clamped < -0.15 ? "short" : "flat",
    score: clamped,
    contributions,
  };
}
