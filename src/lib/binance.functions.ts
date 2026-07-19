import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";

/**
 * Binance USD-M Futures TESTNET — read-only telemetry bridge.
 * Base: https://testnet.binancefuture.com
 * Secrets consumed inside the handler only (never at module scope,
 * never on the client, never in the worker bundle).
 */
const FAPI_BASE = "https://testnet.binancefuture.com";

function sign(query: string, secret: string): string {
  return createHmac("sha256", secret).update(query).digest("hex");
}

export interface FuturesTelemetrySnapshot {
  symbol: string;
  lastPrice: number;
  markPrice: number;
  totalWalletBalance: number;
  totalMarginBalance: number;
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

    // Public: mark price + last price (no signature required)
    const [markRes, tickerRes] = await Promise.all([
      fetch(`${FAPI_BASE}/fapi/v1/premiumIndex?symbol=${data.symbol}`),
      fetch(`${FAPI_BASE}/fapi/v1/ticker/price?symbol=${data.symbol}`),
    ]);
    if (!markRes.ok || !tickerRes.ok) {
      throw new Error(`Binance public feed error: ${markRes.status}/${tickerRes.status}`);
    }
    const mark = (await markRes.json()) as { markPrice: string };
    const ticker = (await tickerRes.json()) as { price: string };

    // Signed: account equity (READ-ONLY endpoint)
    const ts = Date.now();
    const query = `timestamp=${ts}&recvWindow=5000`;
    const signature = sign(query, apiSecret);
    const acctRes = await fetch(
      `${FAPI_BASE}/fapi/v2/account?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } },
    );
    if (!acctRes.ok) {
      const body = await acctRes.text();
      throw new Error(`Binance signed request failed: ${acctRes.status} ${body}`);
    }
    const acct = (await acctRes.json()) as {
      totalWalletBalance: string;
      totalMarginBalance: string;
    };

    return {
      symbol: data.symbol,
      lastPrice: Number(ticker.price),
      markPrice: Number(mark.markPrice),
      totalWalletBalance: Number(acct.totalWalletBalance),
      totalMarginBalance: Number(acct.totalMarginBalance),
      ts,
    };
  });