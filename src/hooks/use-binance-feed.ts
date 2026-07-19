/**
 * Binance Futures live-trade WebSocket — singleton client hook.
 *
 * One shared WS per symbol (default BTCUSDT) across the whole app,
 * so Header/Hero/Today share connection state and last price.
 * Fires-and-forgets subscribers; safe under React StrictMode.
 */
import { useEffect, useState } from "react";

type Status = "connecting" | "open" | "closed";

interface FeedState {
  status: Status;
  lastPrice: number | null;
  lastTs: number | null;
}

interface Feed {
  ws: WebSocket | null;
  state: FeedState;
  subs: Set<(s: FeedState) => void>;
  refCount: number;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

const feeds = new Map<string, Feed>();

function emit(feed: Feed) {
  for (const sub of feed.subs) sub(feed.state);
}

function open(symbol: string) {
  const key = symbol.toLowerCase();
  const feed = feeds.get(key)!;
  if (feed.ws) return;
  feed.state = { ...feed.state, status: "connecting" };
  emit(feed);
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${key}@trade`);
  feed.ws = ws;
  ws.onopen = () => {
    feed.state = { ...feed.state, status: "open" };
    emit(feed);
  };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as { p?: string; T?: number };
      if (msg.p) {
        feed.state = {
          status: "open",
          lastPrice: +msg.p,
          lastTs: msg.T ?? Date.now(),
        };
        emit(feed);
      }
    } catch {
      /* ignore */
    }
  };
  const retry = () => {
    feed.ws = null;
    feed.state = { ...feed.state, status: "closed" };
    emit(feed);
    if (feed.refCount > 0) {
      feed.reconnectTimer = setTimeout(() => open(symbol), 2000);
    }
  };
  ws.onclose = retry;
  ws.onerror = () => ws.close();
}

export function useBinanceTrade(symbol = "BTCUSDT"): FeedState {
  const key = symbol.toLowerCase();
  const [state, setState] = useState<FeedState>(() => {
    return (
      feeds.get(key)?.state ?? { status: "closed", lastPrice: null, lastTs: null }
    );
  });

  useEffect(() => {
    let feed = feeds.get(key);
    if (!feed) {
      feed = {
        ws: null,
        state: { status: "closed", lastPrice: null, lastTs: null },
        subs: new Set(),
        refCount: 0,
      };
      feeds.set(key, feed);
    }
    feed.subs.add(setState);
    feed.refCount++;
    setState(feed.state);
    open(symbol);
    return () => {
      const f = feeds.get(key);
      if (!f) return;
      f.subs.delete(setState);
      f.refCount = Math.max(0, f.refCount - 1);
      if (f.refCount === 0) {
        if (f.reconnectTimer) clearTimeout(f.reconnectTimer);
        f.ws?.close();
        f.ws = null;
      }
    };
  }, [key, symbol]);

  return state;
}
