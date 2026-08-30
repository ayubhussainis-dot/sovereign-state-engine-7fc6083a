import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";

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

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

export const getFuturesTelemetry = createServerFn({ method: "GET" })
  .validator((input: { symbol?: string }) => ({
    symbol: (input?.symbol ?? "BTCUSDT").toUpperCase(),
  }))
  .handler(async ({ data }): Promise<FuturesTelemetrySnapshot> => {
    const apiKey = process.env.BINANCE_TESTNET_API_KEY;
    const apiSecret = process.env.BINANCE_TESTNET_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error("Binance testnet credentials not configured");
    }

    let lastPrice: number | null = null;
    let markPrice: number | null = null;
    let publicFeedError: string | undefined;
    try {
      const [markRes, tickerRes] = await Promise.all([
        fetch(`${FAPI_BASE}/fapi/v1/premiumIndex?symbol=${data.symbol}`, { headers: COMMON_HEADERS }),
        fetch(`${FAPI_BASE}/fapi/v1/ticker/price?symbol=${data.symbol}`, { headers: COMMON_HEADERS }),
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
    try {
      const query = `timestamp=${ts}&recvWindow=5000`;
      const signature = sign(query, apiSecret);
      const acctRes = await fetch(
        `${FAPI_BASE}/fapi/v2/account?${query}&signature=${signature}`,
        { 
          headers: { 
            ...COMMON_HEADERS,
            "X-MBX-APIKEY": apiKey 
          } 
        },
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
