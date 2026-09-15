/**
 * TIX T9 — deterministic observation/parser layer.
 *
 * TIX T9 never decides, predicts, authorizes, or trades.
 * It only parses market transport messages into normalized observations
 * and records stage checkpoints between the deterministic pipeline layers.
 */

export type T9MarketEvent =
  | {
      kind: "BOOK_TICKER";
      bid: number;
      ask: number;
      bidQty: number;
      askQty: number;
      eventTs: number;
    }
  | {
      kind: "AGG_TRADE";
      price: number;
      qty: number;
      side: "buy" | "sell";
      eventTs: number;
    }
  | {
      kind: "MARK_PRICE";
      fundingRate: number;
      eventTs: number;
    };

export type T9Stage =
  | "MARKET"
  | "DIGITAL_TWIN"
  | "JACK_JOKER"
  | "FUSION"
  | "SOALL"
  | "RISK_AUTHORITY"
  | "PAPER_EXECUTION";

export interface T9Checkpoint {
  stage: T9Stage;
  sequence: number;
  observed: boolean;
  direction?: "BULL" | "BEAR" | "NEUTRAL";
  status?: string;
}

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Parse Binance Futures combined-stream transport. No decision logic. */
export function parseBinanceStream(raw: string): T9MarketEvent | null {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  const stream = typeof msg.stream === "string" ? msg.stream : "";
  const data =
    msg.data && typeof msg.data === "object"
      ? (msg.data as Record<string, unknown>)
      : msg;

  if (stream.endsWith("@bookTicker")) {
    const bid = finite(data.b);
    const ask = finite(data.a);
    const bidQty = finite(data.B);
    const askQty = finite(data.A);
    if (bid == null || ask == null || bid <= 0 || ask <= 0) return null;
    return {
      kind: "BOOK_TICKER",
      bid,
      ask,
      bidQty: bidQty ?? 0,
      askQty: askQty ?? 0,
      eventTs: finite(data.E) ?? Date.now(),
    };
  }

  if (stream.endsWith("@aggTrade")) {
    const price = finite(data.p);
    const qty = finite(data.q);
    if (price == null || qty == null || price <= 0 || qty < 0) return null;
    return {
      kind: "AGG_TRADE",
      price,
      qty,
      side: data.m === true ? "sell" : "buy",
      eventTs: finite(data.E ?? data.T) ?? Date.now(),
    };
  }

  if (stream.endsWith("@markPrice@1s")) {
    const fundingRate = finite(data.r);
    if (fundingRate == null) return null;
    return {
      kind: "MARK_PRICE",
      fundingRate,
      eventTs: finite(data.E) ?? Date.now(),
    };
  }

  return null;
}

/** Passive checkpoint. It observes pipeline state but cannot change it. */
export function checkpoint(
  stage: T9Stage,
  sequence: number,
  observation: { direction?: "BULL" | "BEAR" | "NEUTRAL"; status?: string } = {},
): T9Checkpoint {
  return {
    stage,
    sequence,
    observed: true,
    ...observation,
  };
}
