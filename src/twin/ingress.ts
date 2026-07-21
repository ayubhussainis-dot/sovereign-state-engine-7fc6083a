/**
 * Twin Ingress — normalizes a `LiveTick` into an authoritative `TwinTick`.
 *
 * Deterministic · Pure · No side effects · No external deps · Replay safe.
 * The monotonic twin sequence is supplied by the caller (see
 * `InternalMarket.append`); ingress itself does not mutate state.
 */

import type { LiveTick, TwinSide, TwinTick } from "./types";

export interface IngressOptions {
  /** Sequence number to assign to this tick. Caller-owned. */
  twinSeq: number;
}

function normalizeSide(input: LiveTick): TwinSide {
  if (input.side === "buy" || input.side === "sell") return input.side;
  if (input.bid != null && input.ask != null) {
    const mid = (input.bid + input.ask) / 2;
    if (input.price > mid) return "buy";
    if (input.price < mid) return "sell";
  }
  return "unknown";
}

export function normalizeTick(input: LiveTick, opts: IngressOptions): TwinTick {
  return {
    twinSeq: opts.twinSeq,
    ts: input.ts,
    receivedAt: input.receivedAt,
    price: input.price,
    volume: input.volume,
    side: normalizeSide(input),
    bid: input.bid ?? null,
    ask: input.ask ?? null,
    latencyMs: input.receivedAt - input.ts,
  };
}