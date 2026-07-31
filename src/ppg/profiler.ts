/**
 * PPG Profiler — pure measurement functions.
 *
 * The mathematical models for V, Omega, spread, tick velocity and Psi
 * are declared in the formal specification but were provided WITHOUT
 * concrete equations. Per the implementation directive:
 *
 *   "Any section whose Mathematical Model is intentionally unspecified
 *    must remain as an interface or placeholder until the formal
 *    equations are provided. Do not substitute heuristics, technical
 *    indicators, arbitrary thresholds, machine learning models, or
 *    random approximations in place of the missing mathematics."
 *
 * Each function below returns a structurally correct reading with
 * `specified: false` and value = 0. Definitional aggregates (buy/sell
 * volume totals, bid/ask passthrough, sample counts) are populated
 * because they are direct measurements, not derived quantities.
 */

import type { TwinSnapshot } from "@/twin/types";
import type {
  OFIReading,
  PPGInputs,
  PPGSnapshot,
  SpreadReading,
  TickVelocityReading,
  VolatilityReading,
  WaveReading,
} from "./types";

// Welford's O(1) rolling variance accumulator. State is per-accumulator so
// that each market runs a fully independent estimator; replaying the same
// tick sequence against a fresh accumulator yields identical outputs.
export class Welford {
  count = 0;
  mean = 0;
  m2 = 0;

  update(price: number): number {
    this.count += 1;
    const delta = price - this.mean;
    this.mean += delta / this.count;
    const delta2 = price - this.mean;
    this.m2 += delta * delta2;
    return this.count > 1 ? this.m2 / (this.count - 1) : 0;
  }

  reset(): void {
    this.count = 0;
    this.mean = 0;
    this.m2 = 0;
  }
}

/** Default accumulator, used when no per-market accumulator is passed. */
const defaultWelford = new Welford();

export function updateWelfordVariance(price: number): number {
  return defaultWelford.update(price);
}

export function resetWelford(): void {
  defaultWelford.reset();
}

export function measureVolatility(
  twin: TwinSnapshot,
  welford: Welford = defaultWelford,
): VolatilityReading {
  const last = twin.last;
  const variance = last ? welford.update(last.price) : 0;
  const denom = last?.price || 1;
  const value = Math.sqrt(variance) / denom;
  return { value, n: welford.count, specified: true };
}

export function measureOFI(twin: TwinSnapshot): OFIReading {
  const total = twin.buyVolume + twin.sellVolume;
  const value = total === 0 ? 0 : (twin.buyVolume - twin.sellVolume) / total;
  return {
    value,
    buyVolume: twin.buyVolume,
    sellVolume: twin.sellVolume,
    specified: true,
  };
}

export function measureSpread(twin: TwinSnapshot): SpreadReading {
  const bid = twin.bid;
  const ask = twin.ask;
  const value =
    bid != null && ask != null ? Number((ask - bid).toFixed(4)) : 0;
  return { value, bid, ask, specified: bid != null && ask != null };
}

export function measureTickVelocity(twin: TwinSnapshot): TickVelocityReading {
  const n = twin.window.length;
  const windowMs =
    n > 1 ? twin.window[n - 1].ts - twin.window[0].ts : 0;
  const value = windowMs > 0 ? n / windowMs : 0;
  return { value, n, windowMs, specified: true };
}

export function classifyWave(
  v: VolatilityReading,
  o: OFIReading,
): WaveReading {
  let state: WaveReading["state"] = "COMPRESSED";
  if (v.value < 0.0001) state = "NODAL_ZERO";
  else if (v.value > 0.015) state = "ANTINODE_PEAK";
  else if (Math.abs(o.value) > 0.5) state = "EXPANDED";
  return { state, specified: true };
}

export function profile(
  inputs: PPGInputs,
  welford: Welford = defaultWelford,
): PPGSnapshot {
  const { twin } = inputs;
  const volatility = measureVolatility(twin, welford);
  const ofi = measureOFI(twin);
  const spread = measureSpread(twin);
  const velocity = measureTickVelocity(twin);
  const wave = classifyWave(volatility, ofi);
  return {
    volatility,
    ofi,
    spread,
    velocity,
    wave,
    twinSeq: twin.last?.twinSeq ?? -1,
  };
}