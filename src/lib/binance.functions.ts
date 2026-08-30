import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";
import { EDARTRADEEngine } from "./edartrade.engine";

const FAPI_BASE = "https://testnet.binancefuture.com";

// Initialize the EDARTRADE engine instance with default parameters
const edarTrader = new EDARTRADEEngine(78000.0, 0.02, 0.01);

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
      if (signal) {
        console.log(`[EDARTRADE ENGINE SIGNAL] --> ${signal}`);
      }
    }

    // Bypass server-side REST fetching if blocked by CloudFront datacenter IP,
    // allowing the browser WebSocket to drive live telemetry seamlessly.
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
  .validator((input: { symbol: string; side: "BUY" | "SELL"; quantity: number; apiKey: string; apiSecret: string }) => input)
  .handler(async ({ data }) => {
    try {
      const timestamp = Date.now();
      const queryString = `symbol=${data.symbol}&side=${data.side}&type=MARKET&quantity=${data.quantity}&timestamp=${timestamp}`;
      const signature = sign(queryString, data.apiSecret);

      const response = await fetch(`${FAPI_BASE}/fapi/v1/order?${queryString}&signature=${signature}`, {
        method: "POST",
        headers: {
          "X-MBX-APIKEY": data.apiKey,
        },
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        return { error: `Binance API error (HTTP ${response.status}): ${text.slice(0, 200)}` };
      }

      if (!response.ok) {
        return { error: result?.msg || `Binance returned status ${response.status}`, details: result };
      }

      return result;
    } catch (err: any) {
      return { error: err.message || String(err) };
    }
  });
