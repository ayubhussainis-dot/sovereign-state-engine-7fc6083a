/**
 * PPG Telemetry Layer — Types
 *
 * PPG is a *measurement* layer. It observes the twin and emits scalar
 * evidence used by SOALL gates. It contains NO decision logic and NO
 * side effects.
 *
 * Every PPG profiler is:
 *   Deterministic · Pure · No side effects · No external deps · Replay safe.
 */

import type { TwinSnapshot } from "@/twin/types";

export type WaveState =
  | "UNSPECIFIED"
  | "COMPRESSED"
  | "NEUTRAL"
  | "EXPANDED"
  | "NODAL_ZERO"
  | "ANTINODE_PEAK";

export interface VolatilityReading {
  /** \mathcal{V} — TODO(spec): bounded price dispersion. */
  value: number;
  n: number;
  specified: boolean;
}

export interface OFIReading {
  /** \Omega — TODO(spec): buy vs sell pressure delta. */
  value: number;
  buyVolume: number;
  sellVolume: number;
  specified: boolean;
}

export interface SpreadReading {
  /** \delta_s — TODO(spec): |ask - bid|. */
  value: number;
  bid: number | null;
  ask: number | null;
  specified: boolean;
}

export interface TickVelocityReading {
  /** \tau_v — TODO(spec): ticks per millisecond. */
  value: number;
  n: number;
  windowMs: number;
  specified: boolean;
}

export interface WaveReading {
  /** \Psi — TODO(spec): classification from V and Omega. */
  state: WaveState;
  specified: boolean;
}

export interface PPGSnapshot {
  volatility: VolatilityReading;
  ofi: OFIReading;
  spread: SpreadReading;
  velocity: TickVelocityReading;
  wave: WaveReading;
  twinSeq: number;
}

export interface PPGInputs {
  twin: TwinSnapshot;
}