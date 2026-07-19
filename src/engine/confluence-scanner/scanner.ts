import { detectCandlestickPatterns } from "../candlestick/detector";
import { detectChartPatterns } from "../chart-pattern/detector";
import { scoreConfidence } from "../confidence/scorer";
import type { ConfidenceFactor } from "../confidence/types";
import { detectFairValueGaps } from "../fair-value-gap/detector";
import { analyzeLiquidity } from "../liquidity/analyzer";
import { analyzeStructure } from "../market-structure/analyzer";
import { detectOrderBlocks } from "../order-block/detector";
import type {
  ConfluenceBias,
  ConfluenceCandidate,
  ConfluenceHit,
  ConfluenceScanOptions,
  ConfluenceScanResult,
  ScannerInputSymbol,
} from "./types";

/**
 * Run every structural detector over each symbol, aggregate the
 * confluences into a bias + confidence score, and return the ranked
 * candidates.
 */
export function scanConfluence(
  symbols: readonly ScannerInputSymbol[],
  options: ConfluenceScanOptions = {},
): ConfluenceScanResult {
  const minScore = options.minScore ?? 0.35;

  const candidates: ConfluenceCandidate[] = [];
  for (const s of symbols) {
    if (s.bars.length < 5) continue;
    const candidate = analyzeSymbol(s);
    if (Math.abs(candidate.score) < minScore) continue;
    if (options.bias && candidate.bias !== options.bias) continue;
    candidates.push(candidate);
  }

  candidates.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const limited = options.limit ? candidates.slice(0, options.limit) : candidates;

  return { scanned: symbols.length, candidates: limited };
}

function analyzeSymbol(input: ScannerInputSymbol): ConfluenceCandidate {
  const structure = analyzeStructure(input.bars);
  const liquidity = analyzeLiquidity(input.bars);
  const orderBlocks = detectOrderBlocks(input.bars);
  const fvgs = detectFairValueGaps(input.bars);
  const candlesticks = detectCandlestickPatterns(input.bars);
  const chartPatterns = detectChartPatterns(input.bars);

  const hits: ConfluenceHit[] = [];
  let score = 0;

  if (structure.bias !== "neutral") {
    const w = structure.bias === "bullish" ? 0.4 : -0.4;
    hits.push({ id: "structure", label: `structure ${structure.bias}`, bias: structure.bias, weight: w });
    score += w;
  }

  const lastEvent = structure.events[structure.events.length - 1];
  if (lastEvent) {
    const w = lastEvent.direction === "bullish" ? 0.2 : -0.2;
    hits.push({
      id: `structure:${lastEvent.kind}`,
      label: `${lastEvent.kind} ${lastEvent.direction}`,
      bias: lastEvent.direction,
      weight: w,
    });
    score += w;
  }

  const sweep = liquidity.events[liquidity.events.length - 1];
  if (sweep) {
    const dir = sweep.side === "buy" ? "bearish" : "bullish";
    const w = dir === "bullish" ? 0.15 : -0.15;
    hits.push({ id: `liquidity:${sweep.kind}`, label: `${sweep.kind} ${sweep.side}-side`, bias: dir, weight: w });
    score += w;
  }

  const activeBull = orderBlocks.blocks.filter((b) => b.kind === "bullish" && !b.invalidated).length;
  const activeBear = orderBlocks.blocks.filter((b) => b.kind === "bearish" && !b.invalidated).length;
  if (activeBull || activeBear) {
    const w = ((activeBull - activeBear) / Math.max(1, activeBull + activeBear)) * 0.15;
    hits.push({
      id: "order-block",
      label: `OBs bull:${activeBull}/bear:${activeBear}`,
      bias: w > 0 ? "bullish" : w < 0 ? "bearish" : "neutral",
      weight: w,
    });
    score += w;
  }

  const openBullFvg = fvgs.gaps.filter((g) => g.kind === "bullish" && !g.filled).length;
  const openBearFvg = fvgs.gaps.filter((g) => g.kind === "bearish" && !g.filled).length;
  if (openBullFvg || openBearFvg) {
    const w = ((openBullFvg - openBearFvg) / Math.max(1, openBullFvg + openBearFvg)) * 0.1;
    hits.push({
      id: "fvg",
      label: `FVGs bull:${openBullFvg}/bear:${openBearFvg}`,
      bias: w > 0 ? "bullish" : w < 0 ? "bearish" : "neutral",
      weight: w,
    });
    score += w;
  }

  const lastCandle = candlesticks.patterns[candlesticks.patterns.length - 1];
  if (lastCandle && lastCandle.bias !== "neutral") {
    const w = lastCandle.bias === "bullish" ? 0.05 : -0.05;
    hits.push({ id: `candle:${lastCandle.id}`, label: lastCandle.id, bias: lastCandle.bias, weight: w });
    score += w;
  }

  const lastPattern = chartPatterns.patterns[chartPatterns.patterns.length - 1];
  if (lastPattern && lastPattern.bias !== "neutral") {
    const w = lastPattern.bias === "bullish" ? 0.1 : -0.1;
    hits.push({ id: `pattern:${lastPattern.id}`, label: lastPattern.id, bias: lastPattern.bias, weight: w });
    score += w;
  }

  const clamped = Math.max(-1, Math.min(1, score));
  const bias: ConfluenceBias = clamped > 0.2 ? "long" : clamped < -0.2 ? "short" : "flat";

  const factors: ConfidenceFactor[] = hits.map((h) => ({
    id: h.id,
    label: h.label,
    weight: h.weight * (bias === "short" ? -1 : 1),
    importance: 1,
  }));
  const confidence = scoreConfidence(factors);

  return {
    symbol: input.symbol,
    bias,
    score: clamped,
    confidence,
    hits,
    structure,
    liquidity,
    orderBlocks,
    fvgs,
    candlesticks,
    chartPatterns,
  };
}
