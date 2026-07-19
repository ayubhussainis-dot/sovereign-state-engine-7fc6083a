/**
 * Dual-Core Decision Layer
 * ------------------------
 * Runs the same decision thesis twice under perturbation and only emits a
 * directional bias when both cores agree.
 *
 *   Core A → decide() with default weights on the full bar window.
 *   Core B → decide() with a deterministically-jittered weight vector on a
 *            shifted bar window (drops the last bar).
 *
 * If the biases disagree, the plans diverge too far, or either confidence
 * fails the floor, we return a flat decision tagged "dual-core disagreement".
 * This is not "predict twice" — it is "test the same edge under two slightly
 * different lenses". Fragile edges fail this by construction.
 *
 * Deterministic: same inputs → same output. No randomness at call time.
 */

import { decide } from "./engine";
import type { Decision, DecisionInputs, DecisionOptions, DecisionSignal } from "./types";

export interface DualCoreOptions extends DecisionOptions {
  /** Max ± jitter applied to Core B weights. Defaults 0.10 (±10%). */
  jitter?: number;
  /** Max ATR-fraction between Core A and Core B entries. Defaults 0.25. */
  entryTolAtr?: number;
}

export interface DualCoreDecision extends Decision {
  cores: {
    a: Decision;
    b: Decision;
  };
  agreement: {
    agreed: boolean;
    biasMatch: boolean;
    entryDeltaAtr: number | null;
    minConfidence: number;
    reason: string;
  };
}

/**
 * Deterministic pseudo-random in [-1, 1] seeded by (symbol, timestamp, key).
 * FNV-1a on the concatenation → linear congruential smoothing → mapped.
 */
export function deterministicJitter(symbol: string, ts: number, key: string): number {
  const s = `${symbol}|${ts}|${key}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // LCG smoothing to avoid neighboring keys producing near-identical outputs.
  h = (Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0) ^ (h >>> 13);
  const u = (h >>> 0) / 0xffffffff; // 0..1
  return u * 2 - 1;                 // -1..1
}

function jitteredWeights(
  base: DecisionOptions["weights"],
  symbol: string,
  ts: number,
  amount: number,
): DecisionOptions["weights"] {
  const keys: DecisionSignal["source"][] = [
    "structure",
    "liquidity",
    "order-block",
    "fvg",
    "candlestick",
    "chart-pattern",
  ];
  const out: Partial<Record<DecisionSignal["source"], number>> = { ...(base ?? {}) };
  for (const k of keys) {
    const cur = out[k] ?? 1;
    const j = deterministicJitter(symbol, ts, k) * amount;
    out[k] = Math.max(0, cur * (1 + j));
  }
  return out;
}

function atr(bars: DecisionInputs["bars"], period = 14): number | null {
  if (bars.length < 2) return null;
  const n = Math.min(period, bars.length - 1);
  let sum = 0;
  for (let i = bars.length - n; i < bars.length; i++) {
    const b = bars[i];
    const p = bars[i - 1];
    const tr = Math.max(
      b.high - b.low,
      Math.abs(b.high - p.close),
      Math.abs(b.low - p.close),
    );
    sum += tr;
  }
  return sum / n;
}

/**
 * Run Core A + Core B and gate on agreement.
 *
 * Core B uses:
 *  - a jittered weight vector (±jitter, deterministic per symbol/timestamp)
 *  - a shifted lookback window (drops the last bar) → re-derived structure,
 *    liquidity, OBs, FVGs, candlesticks, chart patterns.
 */
export function decideDualCore(
  inputs: DecisionInputs,
  buildShiftedInputs: (bars: DecisionInputs["bars"]) => DecisionInputs,
  options: DualCoreOptions = {},
): DualCoreDecision {
  const minConf = options.minConfidence ?? 0.35;
  const jitter = options.jitter ?? 0.10;
  const entryTolAtr = options.entryTolAtr ?? 0.25;
  const lastBar = inputs.bars[inputs.bars.length - 1];
  const ts = lastBar?.time ?? Date.now();

  const coreA = decide(inputs, options);

  const shiftedBars = inputs.bars.slice(0, -1);
  const shifted = shiftedBars.length >= 20
    ? buildShiftedInputs(shiftedBars)
    : inputs; // not enough bars to shift; fall back to same set
  const coreB = decide(shifted, {
    ...options,
    weights: jitteredWeights(options.weights, inputs.symbol, ts, jitter),
  });

  const a = atr(inputs.bars) ?? 0;
  let entryDeltaAtr: number | null = null;
  if (coreA.plan && coreB.plan && a > 0) {
    entryDeltaAtr = Math.abs(coreA.plan.entry - coreB.plan.entry) / a;
  }

  const biasMatch =
    coreA.bias !== "flat" && coreA.bias === coreB.bias;
  const confOk = Math.min(coreA.confidence, coreB.confidence) >= minConf;
  const entryOk =
    entryDeltaAtr === null ? true : entryDeltaAtr <= entryTolAtr;

  const agreed = biasMatch && confOk && entryOk;

  let reason: string;
  if (agreed) {
    reason = "dual-core agreement";
  } else if (!biasMatch) {
    reason = `dual-core disagreement (A=${coreA.bias}, B=${coreB.bias})`;
  } else if (!confOk) {
    reason = `dual-core low confidence (minConf ${minConf}, A=${coreA.confidence.toFixed(2)}, B=${coreB.confidence.toFixed(2)})`;
  } else {
    reason = `dual-core entry drift ${entryDeltaAtr?.toFixed(2)} ATR > ${entryTolAtr}`;
  }

  const bias = agreed ? coreA.bias : "flat";
  const confidence = agreed ? Math.min(coreA.confidence, coreB.confidence) : 0;
  const plan = agreed ? coreA.plan : undefined;
  const score = agreed ? (coreA.score + coreB.score) / 2 : 0;

  return {
    symbol: inputs.symbol,
    bias,
    confidence,
    score,
    signals: coreA.signals,
    plan,
    rationale: [
      `[Core A] ${coreA.rationale}`,
      `[Core B] ${coreB.rationale}`,
      `[Gate] ${reason}`,
    ].join("\n"),
    createdAt: Date.now(),
    cores: { a: coreA, b: coreB },
    agreement: {
      agreed,
      biasMatch,
      entryDeltaAtr,
      minConfidence: minConf,
      reason,
    },
  };
}
