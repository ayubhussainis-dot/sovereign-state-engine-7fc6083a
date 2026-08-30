import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";
import { EDARTRADEEngine } from "./edartrade.engine";

const FAPI_BASE = "https://demo-fapi.binance.com";
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
    }
    return {
      symbol: data.symbol,
      lastPrice: data.currentPrice ?? null,
      markPrice: null,
      totalWalletBalance: null,
      totalMarginBalance: null,
      edartradeSignal: signal,
      ts,
    };
  });

export const executeDirectOrder = createServerFn({ method: "POST" })
  .validator((input: { symbol: string; side: "BUY" | "SELL"; quantity: number; apiKey: string; apiSecret: string }) => input)
  .handler(async ({ data }) => {
    if (!data.apiKey || !data.apiSecret) {
      throw new Error("Binance Testnet API Key or Secret is unconfigured.");
    }

    const timestamp = Date.now();
    const queryString = `symbol=${data.symbol}&side=${data.side}&type=MARKET&quantity=${data.quantity}&recvWindow=60000&timestamp=${timestamp}`;
    const signature = sign(queryString, data.apiSecret);

    const url = `${FAPI_BASE}/fapi/v1/order?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-MBX-APIKEY": data.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseText = await response.text();
    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText);
    } catch {
      throw new Error(`Binance HTTP ${response.status} Non-JSON Response: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(`Binance Order Rejection [HTTP ${response.status}]: ${JSON.stringify(jsonResult)}`);
    }

    return jsonResult;
  });

export const getActivePosition = createServerFn({ method: "GET" })
  .validator((input: { symbol: string; apiKey: string; apiSecret: string }) => input)
  .handler(async ({ data }) => {
    if (!data.apiKey || !data.apiSecret) return null;

    try {
      const timestamp = Date.now();
      const queryString = `symbol=${data.symbol}&recvWindow=60000&timestamp=${timestamp}`;
      const signature = sign(queryString, data.apiSecret);

      const url = `${FAPI_BASE}/fapi/v2/positionRisk?${queryString}&signature=${signature}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-MBX-APIKEY": data.apiKey,
        },
      });

      const responseText = await response.text();
      let jsonResult;
      try {
        jsonResult = JSON.parse(responseText);
      } catch {
        return null;
      }

      if (!response.ok || !Array.isArray(jsonResult)) {
        return null;
      }

      const position = jsonResult.find((p: any) => p.symbol === data.symbol);
      if (!position) return null;

      return {
        hasPosition: parseFloat(position.positionAmt) !== 0,
        positionAmt: parseFloat(position.positionAmt),
        entryPrice: parseFloat(position.entryPrice),
        unRealizedProfit: parseFloat(position.unRealizedProfit),
        leverage: parseInt(position.leverage),
      };
    } catch {
      return null;
    }
  });
