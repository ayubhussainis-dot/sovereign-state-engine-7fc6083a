/**
 * Internal Market — the authoritative in-memory tape.
 *
 * Owns the monotonic twin sequence and the rolling window used by every
 * downstream module. The `append` method is the single writer; all
 * readers receive an immutable `TwinSnapshot`.
 *
 * Determinism: no wall-clock reads. `TwinSnapshot.window` is a frozen
 * slice — replaying the same `LiveTick` sequence against a fresh
 * `InternalMarket` produces identical snapshots.
 */

import { kick } from "./ingress";
import type { LiveTick, TwinSnapshot, TwinTick } from "./types";

export interface InternalMarketOptions {
  /** Rolling window capacity in ticks. */
  capacity?: number;
}

export class InternalMarket {
  private readonly capacity: number;
  private readonly buf: TwinTick[] = [];
  private nextSeq = 0;

  constructor(opts: InternalMarketOptions = {}) {
    this.capacity = Math.max(1, opts.capacity ?? 2048);
  }

  append(live: LiveTick): TwinTick {
    const tick = kick(live, { twinSeq: this.nextSeq++ });
    this.buf.push(tick);
    if (this.buf.length > this.capacity) this.buf.shift();
    return tick;
  }

  snapshot(): TwinSnapshot {
    if (this.buf.length === 0) {
      return {
        last: null,
        window: Object.freeze([]),
        bid: null,
        ask: null,
        buyVolume: 0,
        sellVolume: 0,
      };
    }
    let buyVolume = 0;
    let sellVolume = 0;
    let bid: number | null = null;
    let ask: number | null = null;
    for (const t of this.buf) {
      if (t.side === "buy") buyVolume += t.volume;
      else if (t.side === "sell") sellVolume += t.volume;
      if (t.bid != null) bid = t.bid;
      if (t.ask != null) ask = t.ask;
    }
    return {
      last: this.buf[this.buf.length - 1],
      window: Object.freeze(this.buf.slice()),
      bid,
      ask,
      buyVolume,
      sellVolume,
    };
  }

  reset(): void {
    this.buf.length = 0;
    this.nextSeq = 0;
  }
}
