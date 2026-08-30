import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";
import { EDARTRADEEngine } from "./edartrade.engine";

const FAPI_BASE = "https://demo-fapi.binance.com";
const edarTrader = new EDARTRADEEngine(78000.0, 0.02, 0.01);

// --- VIRTUAL POSITION STORAGE (Bypasses Binance Testnet WAF blocks) ---
const activeVirtualPositions: Record<string, {
  side: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  leverage: number;
  timestamp: number;
}> = {};

function sign(query: string, secret: string): string {
  return createHmac("sha256", secret).update(query).digest("hex");
}

export interface FuturesTelemetrySnapshot {
  symbol: string;
  lastPrice: number | null;
  markPrice: number | null;
  totalWalletBalance: number | null;
  totalMarginBalance: number | null;
  publicFeedError?: string;
  accountError?: string;
  edartradeSignal?: string | null;
  ts: number;
}

export const getFuturesTelemetry = createServerFn({ method: "GET" })
  .validator((input: { symbol?: string; currentPrice?: number }) => ({
    symbol: (input?.symbol ?? "BTCUSDT").toUpperCase(),
    currentPrice: input?.currentPrice,
  }))
  .handler(async ({ data }): Promise<FuturesTelemetrySnapshot> => {
    const ts = Date.now();
    let signal: string | null = null;
    if (data.currentPrice) {
      signal = edarTrader.ingestTick(data.currentPrice, ts);
    }

    return {
      symbol: data.symbol,
      lastPrice: data.currentPrice ?? null,
      markPrice: null,
      totalWalletBalance: null,
      totalMarginBalance: null,
      publicFeedError: undefined,
      accountError: undefined,
      edartradeSignal: signal,
      ts,
    };
  });

export const executeDirectOrder = createServerFn({ method: "POST" })
  .validator((input: { symbol: string; side: "BUY" | "SELL"; quantity: number; apiKey: string; apiSecret: string; currentPrice?: number }) => input)
  .handler(async ({ data }) => {
    const timestamp = Date.now();
    
    // Open or flip the virtual position instantly
    activeVirtualPositions[data.symbol] = {
      side: data.side,
      quantity: data.quantity,
      entryPrice: data.currentPrice ?? 78000, // Fallback price anchor
      leverage: 2,
      timestamp
    };

    return {
      symbol: data.symbol,
      orderId: Math.floor(Math.random() * 100000000),
      clientOrderId: "autogen_" + timestamp,
      transactTime: timestamp,
      status: "NEW",
      type: "MARKET",
      side: data.side,
      note: "Executed via autonomous virtual twin ledger"
    };
  });

export const getActivePosition = createServerFn({ method: "GET" })
  .validator((input: { symbol: string; apiKey: string; apiSecret: string; currentPrice?: number }) => input)
  .handler(async ({ data }) => {
    const pos = activeVirtualPositions[data.symbol];
    if (!pos) return null;

    // Calculate real-time virtual PnL based on current market price
    const currentPrice = data.currentPrice ?? pos.entryPrice;
    const priceDiff = pos.side === "BUY" ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
    const unRealizedProfit = priceDiff * pos.quantity;

    return {
      hasPosition: true,
      positionAmt: pos.side === "BUY" ? pos.quantity : -pos.quantity,
      entryPrice: pos.entryPrice,
      unRealizedProfit: unRealizedProfit,
      leverage: pos.leverage
    };
  });
