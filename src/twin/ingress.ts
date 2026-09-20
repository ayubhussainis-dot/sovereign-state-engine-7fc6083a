/**
 * JOALL Ingress
 *
 * Every market Tick becomes one internal Kick.
 * A Kick is the heartbeat of the JOALL Mirror.
 * The Kick creates the next Twin state.
 *
 * The real market remains external.
 * JOALL only evolves its own mirrored world.
 *
 * Contract:
 *   Deterministic · Pure · No side effects · Replay safe.
 */

import type {
  LiveTick,
  TwinSide,
  TwinTick,
} from "./types";

export interface IngressOptions {
  /** Sequence number to assign to this tick. Caller-owned. */
  twinSeq: number;
}

/*
 * Maximum latency that can be treated as a valid
 * synchronization measurement.
 *
 * This prevents malformed timestamp differences from
 * becoming artificial multi-second synchronization failures.
 */
const MAX_VALID_LATENCY_MS = 1000;

function normalizeSide(
  input: LiveTick,
): TwinSide {
  if (
    input.side === "buy" ||
    input.side === "sell"
  ) {
    return input.side;
  }

  if (
    input.bid != null &&
    input.ask != null
  ) {
    const mid =
      (input.bid + input.ask) / 2;

    if (input.price > mid) {
      return "buy";
    }

    if (input.price < mid) {
      return "sell";
    }
  }

  return "unknown";
}

function calculateLatencyMs(
  ts: number,
  receivedAt: number,
): number {
  if (
    !Number.isFinite(ts) ||
    !Number.isFinite(receivedAt)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const latency =
    Math.abs(receivedAt - ts);

  /*
   * Reject impossible timestamp differences.
   *
   * A malformed clock value should not be interpreted
   * as genuine market latency.
   */
  if (
    !Number.isFinite(latency) ||
    latency > MAX_VALID_LATENCY_MS
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return latency;
}

export function kick(
  input: LiveTick,
  opts: IngressOptions,
): TwinTick {
  const latencyMs =
    calculateLatencyMs(
      input.ts,
      input.receivedAt,
    );

  return {
    twinSeq: opts.twinSeq,

    ts: input.ts,

    receivedAt:
      input.receivedAt,

    price:
      input.price,

    volume:
      input.volume,

    side:
      normalizeSide(input),

    bid:
      input.bid ?? null,

    ask:
      input.ask ?? null,

    latencyMs,
  };
}
