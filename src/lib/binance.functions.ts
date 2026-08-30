import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";
import { EDARTRADEEngine } from "./edartrade.engine";

const FAPI_BASE = "https://testnet.binancefuture.com";

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

function sign(query: string, secret: string): string {
  return createHmac("sha256", secret).update(query).digest("hex");
}

export async function fetchFuturesTelemetry(
  symbol: string,
): Promise<FuturesTelemetrySnapshot> {
  const apiKey = process.env["BINANCE_TESTNET_API_KEY"];
  const apiSecret = process.env["BINANCE_TESTNET_API_SECRET"];

  let lastPrice: number | null = null;
  let markPrice: number | null = null;
  let publicFeedError: string | undefined;
  try {
    const [markRes, tickerRes] = await Promise.all([
      fetch(`${FAPI_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`),
      fetch(`${FAPI_BASE}/fapi/v1/ticker/price?symbol=${symbol}`),
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

  let totalWalletBalance: number | null = null;
  let totalMarginBalance: number | null = null;
  let accountError: string | undefined;
  const ts = Date.now();
  if (!apiKey || !apiSecret) {
    accountError = "credentials not configured";
  } else {
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
  }

  return {
    symbol,
    lastPrice,
    markPrice,
    totalWalletBalance,
    totalMarginBalance,
    publicFeedError,
    accountError,
    ts,
  };
}
