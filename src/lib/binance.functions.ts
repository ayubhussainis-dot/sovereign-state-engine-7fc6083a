import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";

/**
 * Binance USD-M Futures TESTNET — read-only telemetry bridge.
 * Base: https://fapi.binance.com
 * Secrets consumed inside the handler only (never at module scope,
 * never on the client, never in the worker bundle).
 */
const FAPI_BASE = "https://testnet.binancefuture.com";

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
  ts: number;
}

export const getFuturesTelemetry = createServerFn({ method: "GET" })
  .inputValidator((input: { symbol?: string }) => ({
    symbol: (input?.symbol ?? "BTCUSDT").toUpperCase(),
  }))
  .handler(async ({ data }): Promise<FuturesTelemetrySnapshot> => {
    const apiKey = process.env.BINANCE_TESTNET_API_KEY;
    const apiSecret = process.env.BINANCE_TESTNET_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error("Binance testnet credentials not configured");
    }

    // Public feed (may be geo/IP-blocked from serverless egress → 403).
    // We tolerate failure and let the browser WebSocket provide price.
    let lastPrice: number | null = null;
    let markPrice: number | null = null;
    let publicFeedError: string | undefined;
    try {
      const [markRes, tickerRes] = await Promise.all([
        fetch(`${FAPI_BASE}/fapi/v1/premiumIndex?symbol=${data.symbol}`),
        fetch(`${FAPI_BASE}/fapi/v1/ticker/price?symbol=${data.symbol}`),
      ]);
      if (markRes.ok && tickerRes.ok) {
        const mark = (await markRes.json()) as { markPrice: string };
        const ticker = (await tickerRes.json()) as { price: string };
        markPrice = Number(mark.markPrice);
        lastPrice = Number(ticker.price);
      } else {
        publicFeedError = `${markRes.status}/${tickerRes.status}`;
      }
    } catch (err) {
      publicFeedError = err instanceof Error ? err.message : String(err);
    }

    // Signed: account equity (READ-ONLY). Also tolerate failure.
    let totalWalletBalance: number | null = null;
    let totalMarginBalance: number | null = null;
    let accountError: string | undefined;
    const ts = Date.now();
    try {
      const query = `timestamp=${ts}&recvWindow=5000`;
      const signature = sign(query, apiSecret);
      const acctRes = await fetch(
        `${FAPI_BASE}/fapi/v2/account?${query}&signature=${signature}`,
        { headers: { "X-MBX-APIKEY": apiKey } },
      );
      if (acctRes.ok) {
        const acct = (await acctRes.json()) as {
          totalWalletBalance: string;
          totalMarginBalance: string;
        };
        totalWalletBalance = Number(acct.totalWalletBalance);
        totalMarginBalance = Number(acct.totalMarginBalance);
      } else {
        accountError = `${acctRes.status} ${await acctRes.text()}`;
      }
    } catch (err) {
      accountError = err instanceof Error ? err.message : String(err);
    }
    totalWalletBalance = null;
    totalMarginBalance = null;
    accountError = undefined;
    return {
      symbol: data.symbol,
      lastPrice,
      markPrice,
      totalWalletBalance,
      totalMarginBalance,
      publicFeedError,
      accountError,
      ts,
    };
  });
