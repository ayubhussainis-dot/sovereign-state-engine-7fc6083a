/**
 * Twin ↔ Live Mirror — computes drift/latency of a candidate live tick
 * against the current twin snapshot.
 *
 * Deterministic · Pure · No side effects · No external deps · Replay safe.
 */

import type { LiveTick, MirrorReport, TwinSnapshot } from "./types";

export function measureMirror(
  snapshot: TwinSnapshot,
  live: LiveTick,
): MirrorReport | null {
  if (!snapshot.last) return null;
  return {
    priceDrift: Math.abs(snapshot.last.price - live.price),
    latencyMs: live.receivedAt - live.ts,
    twinSeq: snapshot.last.twinSeq,
  };
}