import type { OHLCBar } from "../market-structure/types";
import type {
  Decision,
  DecisionInputs,
  DecisionOptions,
  DecisionPlan,
  DecisionSignal,
} from "./types";

const DEFAULT_WEIGHTS: Record<DecisionSignal["source"], number> = {
  structure: 0.30,
  liquidity: 0.20,
  "order-block": 0.15,
  fvg: 0.10,
  candlestick: 0.10,
  "chart-pattern": 0.15,
};

/**
 * Fuse structural signals into a single directional decision. The scoring
 * is transparent: each signal contributes a signed weight; the sum drives
 * bias; the absolute normalized value drives confidence.
 */
export function decide(
  inputs: DecisionInputs,
  options: DecisionOptions = {},
): Decision {
  const now = Date.now();
  const minConf = options.minConfidence ?? 0.35;
  const targetRR = options.targetRR ?? 2;
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights ?? {}) };

  const signals: DecisionSignal[] = [];

  // Structure: current bias + last event
  const s = inputs.structure;
  if (s.bias !== "neutral") {
    const lastEvent = s.events[s.events.length - 1];
    const bonus = lastEvent?.kind === "MSS" ? 1.2 : lastEvent?.kind === "CHoCH" ? 1.0 : 0.8;
    signals.push({
      source: "structure",
      bias: s.bias === "bullish" ? "bullish" : "bearish",
      weight: (s.bias === "bullish" ? 1 : -1) * weights.structure * bonus,
      reason: lastEvent
        ? `Structure ${s.bias} after ${lastEvent.kind} at ${lastEvent.level.toFixed(2)}`
        : `Structure bias ${s.bias}`,
    });
  }

  // Liquidity: recent stop-hunts imply a reversal bias
  const liq = inputs.liquidity;
  if (liq) {
    const recent = liq.events.slice(-3);
    for (const ev of recent) {
      if (ev.kind === "stop-hunt") {
        const dir = ev.side === "buy" ? "bearish" : "bullish";
        signals.push({
          source: "liquidity",
          bias: dir,
          weight: (dir === "bullish" ? 1 : -1) * weights.liquidity,
          reason: `Stop hunt of ${ev.side}-side liquidity at ${ev.level.toFixed(2)}`,
        });
      }
    }
  }

  // Order blocks: nearest unmitigated OB in the direction of structure
  const obs = inputs.orderBlocks ?? [];
  const lastPrice = inputs.bars[inputs.bars.length - 1]?.close;
  if (lastPrice) {
    const alignedBull = obs.find((b) => b.kind === "bullish" && !b.invalidated && b.high >= lastPrice * 0.98 && b.low <= lastPrice);
    const alignedBear = obs.find((b) => b.kind === "bearish" && !b.invalidated && b.low <= lastPrice * 1.02 && b.high >= lastPrice);
    if (alignedBull) {
      signals.push({
        source: "order-block",
        bias: "bullish",
        weight: weights["order-block"],
        reason: `Price at bullish OB ${alignedBull.low.toFixed(2)}–${alignedBull.high.toFixed(2)}`,
      });
    }
    if (alignedBear) {
      signals.push({
        source: "order-block",
        bias: "bearish",
        weight: -weights["order-block"],
        reason: `Price at bearish OB ${alignedBear.low.toFixed(2)}–${alignedBear.high.toFixed(2)}`,
      });
    }
  }

  // FVGs: unfilled gaps in the direction of structure
  const fvgs = inputs.fvgs ?? [];
  const openFvgs = fvgs.filter((g) => !g.filled && !g.invalidated).slice(-3);
  for (const g of openFvgs) {
    signals.push({
      source: "fvg",
      bias: g.kind === "bullish" ? "bullish" : "bearish",
      weight: (g.kind === "bullish" ? 1 : -1) * weights.fvg * Math.min(1, g.size * 100),
      reason: `Unfilled ${g.kind} FVG ${g.bottom.toFixed(2)}–${g.top.toFixed(2)}`,
    });
  }

  // Candlesticks: only the most recent, weighted by pattern strength
  const cs = inputs.candlesticks ?? [];
  const lastIndex = inputs.bars.length - 1;
  const recentCs = cs.filter((p) => p.index >= lastIndex - 2);
  for (const p of recentCs) {
    if (p.bias === "neutral") continue;
    signals.push({
      source: "candlestick",
      bias: p.bias,
      weight: (p.bias === "bullish" ? 1 : -1) * weights.candlestick * p.strength,
      reason: `${p.id} (${p.bias}) at bar ${p.index}`,
    });
  }

  // Chart patterns: most recent pattern with a directional bias
  const cps = inputs.chartPatterns ?? [];
  const lastCp = [...cps].reverse().find((p) => p.bias !== "neutral");
  if (lastCp) {
    signals.push({
      source: "chart-pattern",
      bias: lastCp.bias,
      weight: (lastCp.bias === "bullish" ? 1 : -1) * weights["chart-pattern"] * lastCp.strength,
      reason: `${lastCp.id} (${lastCp.bias})${lastCp.level ? ` neckline ${lastCp.level.toFixed(2)}` : ""}`,
    });
  }

  const score = signals.reduce((s, sig) => s + sig.weight, 0);
  const magnitude = signals.reduce((s, sig) => s + Math.abs(sig.weight), 0);
  const confidence = magnitude > 0 ? Math.min(1, Math.abs(score) / magnitude) : 0;

  let bias: Decision["bias"] = "flat";
  if (confidence >= minConf) {
    bias = score > 0 ? "long" : score < 0 ? "short" : "flat";
  }

  const plan = buildPlan(inputs.bars, bias, s, targetRR);
  const rationale = signals.length
    ? signals.map((sig) => `• ${sig.reason} (${sig.weight >= 0 ? "+" : ""}${sig.weight.toFixed(2)})`).join("\n")
    : "No signals present.";

  return {
    symbol: inputs.symbol,
    bias,
    confidence,
    score,
    signals,
    plan,
    rationale,
    createdAt: now,
  };
}

function buildPlan(
  bars: readonly OHLCBar[],
  bias: Decision["bias"],
  structure: DecisionInputs["structure"],
  rr: number,
): DecisionPlan | undefined {
  if (bias === "flat") return undefined;
  const last = bars[bars.length - 1];
  if (!last) return undefined;
  const entry = last.close;
  const stop =
    bias === "long"
      ? (structure.lastLow?.price ?? last.low)
      : (structure.lastHigh?.price ?? last.high);
  const risk = bias === "long" ? entry - stop : stop - entry;
  if (risk <= 0) return undefined;
  const target = bias === "long" ? entry + risk * rr : entry - risk * rr;
  return { entry, stop, targets: [target], rr };
}
