 /**
 * JOALL Ingress
 *
 * Every market Tick becomes one internal Kick.
 * A Kick is the heartbeat of the JOALL Mirror.
 * The Kick creates the next Twin state.
 *
 * The real market remains external.
 * JOALL only evolves its own mirrored world.
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

export function kick(input: LiveTick, opts: IngressOptions): TwinTick {
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
