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

export function measureVolatility(twin: TwinSnapshot): VolatilityReading {
  // TODO(spec): implement \mathcal{V} once the formal equation is provided.
  return { value: 0, n: twin.window.length, specified: false };
}

export function measureOFI(twin: TwinSnapshot): OFIReading {
  // TODO(spec): implement \Omega. Buy/sell totals are definitional.
  return {
    value: 0,
    buyVolume: twin.buyVolume,
    sellVolume: twin.sellVolume,
    specified: false,
  };
}

export function measureSpread(twin: TwinSnapshot): SpreadReading {
  // TODO(spec): implement \delta_s once the formal equation is provided.
  return { value: 0, bid: twin.bid, ask: twin.ask, specified: false };
}

export function measureTickVelocity(twin: TwinSnapshot): TickVelocityReading {
  // TODO(spec): implement \tau_v once the formal equation is provided.
  const n = twin.window.length;
  const windowMs =
    n >= 2 ? twin.window[n - 1].ts - twin.window[0].ts : 0;
  return { value: 0, n, windowMs, specified: false };
}

export function classifyWave(
  _v: VolatilityReading,
  _o: OFIReading,
): WaveReading {
  // TODO(spec): implement \Psi classification once thresholds are provided.
  return { state: "UNSPECIFIED", specified: false };
}

export function profile(inputs: PPGInputs): PPGSnapshot {
  const { twin } = inputs;
  const volatility = measureVolatility(twin);
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