// ============================================================
// N.O.T · BINANCE PUBLIC MIRROR FEED (ported from Sovereign Engine)
// Public market-data streams only (no API key, no trading).
// The app never sees itself as a trader — it is a mirror.
// J.O.ALL subscribes to THIS feed for the digital-twin layer.
// ============================================================

import { useEffect, useState } from "react";

export type MirrorFrame = {
  connected: boolean;
  symbol: string;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  mid: number;
  spreadBps: number;
  velocityBps: number;   // d(mid)/dt in bps/s (EMA)
  bidPressure: number;   // 0..100
  askPressure: number;   // 0..100
  orderFlow: number;     // signed taker volume EMA (0..160 scaled)
  /** Signed, self-normalised taker flow imbalance in [-1, 1]. */
  flowImbalance: number;
  /** EMA of |signed taker qty| — the normalising scale for flowImbalance. */
  flowScale: number;
  latencyNs: number;     // event-to-client latency (ns)
  fundingBps: number;    // funding rate in bps
  lastTradeAt: number;
  /** Last taker trade price (aggTrade). Drives the twin tick tape. */
  lastPrice: number;
  /** Last taker trade quantity. */
  lastQty: number;
  /** Aggressor side of the last taker trade. */
  lastSide: "buy" | "sell" | null;
  /** Exchange event timestamp of the last taker trade (ms). */
  lastEventTs: number;
};

function streamUrl(symbol: string) {
  const s = symbol.toLowerCase();
  return `wss://stream.binance.com:9443/stream?streams=${s}@bookTicker/${s}@aggTrade/${s}@markPrice@1s`;
}

type Listener = (f: MirrorFrame) => void;

export class BinanceMirror {
  readonly pair: string;
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private frame: MirrorFrame;
  private lastMid = 0;
  private lastMidAt = 0;
  private velEma = 0;
  private flowEma = 0;
  private absFlowEma = 0;
  private pressureEma = 50;
  private reconnectDelay = 1000;

  constructor(pair: string) {
    this.pair = pair.toUpperCase();
    this.frame = {
      connected: false,
      symbol: this.pair,
      bid: 0, ask: 0, bidQty: 0, askQty: 0, mid: 0,
      spreadBps: 0, velocityBps: 0,
      bidPressure: 50, askPressure: 50,
      orderFlow: 0, flowImbalance: 0, flowScale: 0,
      latencyNs: 0, fundingBps: 0,
      lastTradeAt: 0,
      lastPrice: 0, lastQty: 0, lastSide: null, lastEventTs: 0,
    };
  }

  start() {
    if (this.ws) return;
    this.connect();
  }

  private attempts = 0;

  private connect() {
    this.attempts++;
    console.info(
      `[Mirror] ${this.pair} connecting (attempt ${this.attempts}) → ${streamUrl(this.pair)}`,
    );
    try {
      this.ws = new WebSocket(streamUrl(this.pair));
    } catch (err) {
      console.error(`[Mirror] ${this.pair} socket construction failed`, err);
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      console.info(`[Mirror] ${this.pair} connected`);
      this.reconnectDelay = 1000;
      this.attempts = 0;
      this.frame.connected = true;
      this.emit();
    };
    this.ws.onclose = () => {
      console.warn(`[Mirror] ${this.pair} closed — scheduling reconnect`);
      this.frame.connected = false;
      this.emit();
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      console.error(`[Mirror] ${this.pair} socket error`);
      try { this.ws?.close(); } catch { /* noop */ }
    };
    this.ws.onmessage = (ev) => this.handle(ev.data);
  }

  private scheduleReconnect() {
    this.ws = null;
    const d = Math.min(this.reconnectDelay, 15000);
    this.reconnectDelay = Math.min(d * 2, 15000);
    console.info(`[Mirror] ${this.pair} reconnect in ${d}ms`);
    setTimeout(() => this.connect(), d);
  }

  private handle(raw: string) {
    let msg: { stream?: string; data?: unknown } & Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }
    const stream: string = msg.stream ?? "";
    const d = (msg.data ?? msg) as Record<string, unknown>;
    const nowMs = Date.now();

    if (stream.endsWith("@bookTicker")) {
      const bid = parseFloat(String(d.b));
      const ask = parseFloat(String(d.a));
      const bidQty = parseFloat(String(d.B));
      const askQty = parseFloat(String(d.A));
      if (!bid || !ask) return;
      const mid = (bid + ask) / 2;
      const spreadBps = ((ask - bid) / mid) * 10000;
      if (this.lastMid && this.lastMidAt) {
        const dt = Math.max(1, nowMs - this.lastMidAt) / 1000;
        const instVel = ((mid - this.lastMid) / this.lastMid) * 10000 / dt;
        this.velEma = this.velEma * 0.85 + Math.abs(instVel) * 0.15;
      }
      this.lastMid = mid;
      this.lastMidAt = nowMs;
      const totalQty = bidQty + askQty || 1;
      const instPressure = (bidQty / totalQty) * 100;
      this.pressureEma = this.pressureEma * 0.8 + instPressure * 0.2;
      this.frame = {
        ...this.frame,
        bid, ask, bidQty, askQty, mid, spreadBps,
        velocityBps: this.velEma,
        bidPressure: this.pressureEma,
        askPressure: 100 - this.pressureEma,
      };
      this.emit();
    } else if (stream.endsWith("@aggTrade")) {
      const qty = parseFloat(String(d.q));
      const price = parseFloat(String(d.p));
      const isBuyerMaker = !!d.m;
      const signed = (isBuyerMaker ? -1 : 1) * qty;
      this.flowEma = this.flowEma * 0.9 + signed * 0.1;
      // Self-normalising scale: EMA of trade magnitude. Dividing the signed
      // flow EMA by it yields a real directional magnitude in [-1, 1]
      // regardless of the instrument's absolute lot size.
      this.absFlowEma = this.absFlowEma * 0.9 + Math.abs(signed) * 0.1;
      const scale = Math.max(this.absFlowEma, 1e-8);
      const flowImbalance = Math.max(-1, Math.min(1, this.flowEma / scale));
      const eventMs = Number(d.E ?? d.T ?? nowMs);
      const latencyMs = Math.max(0, nowMs - eventMs);
      if (this.frame.lastTradeAt === 0) {
        console.info(`[Mirror] ${this.pair} FIRST TICK @ ${price}`);
      }
      this.frame = {
        ...this.frame,
        orderFlow: Math.max(0, Math.min(160, 80 + flowImbalance * 80)),
        flowImbalance,
        flowScale: this.absFlowEma,
        latencyNs: latencyMs * 1_000_000,
        lastTradeAt: nowMs,
        lastPrice: isNaN(price) ? this.frame.lastPrice : price,
        lastQty: isNaN(qty) ? 0 : qty,
        lastSide: isBuyerMaker ? "sell" : "buy",
        lastEventTs: eventMs,
      };
      this.emit();
    } else if (stream.endsWith("@markPrice@1s")) {
      const r = parseFloat(String(d.r));
      if (!isNaN(r)) {
        this.frame = { ...this.frame, fundingBps: r * 10000 };
        this.emit();
      }
    }
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.frame);
    return () => { this.listeners.delete(l); };
  }

  private emit() {
    for (const l of this.listeners) l(this.frame);
  }

  get current() { return this.frame; }
}

const mirrors = new Map<string, BinanceMirror>();

/** One mirror per market pair. Started lazily on first request. */
export function getMirror(pair: string): BinanceMirror {
  const key = pair.toUpperCase();
  let m = mirrors.get(key);
  if (!m) {
    m = new BinanceMirror(key);
    mirrors.set(key, m);
    if (typeof window !== "undefined") m.start();
  }
  return m;
}

/** Legacy default handle — BTCUSDT. */
export const binanceMirror = getMirror("BTCUSDT");

export function useMirrorFrame(pair = "BTCUSDT"): MirrorFrame {
  const [frame, setFrame] = useState<MirrorFrame>(() => getMirror(pair).current);
  useEffect(() => {
    const unsub = getMirror(pair).subscribe(setFrame);
    return () => { unsub(); };
  }, [pair]);
  return frame;
}
