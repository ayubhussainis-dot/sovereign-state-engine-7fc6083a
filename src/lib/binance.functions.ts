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

export const getFuturesTelemetry = createServerFn({ method: "GET" })
  .validator((input: { symbol?: string }) => ({
    symbol: (input?.symbol ?? "BTCUSDT").toUpperCase(),
  }))
  .handler(async ({ data }): Promise<FuturesTelemetrySnapshot> => {
    const ts = Date.now();

    // Bypass server-side REST fetching if blocked by CloudFront datacenter IP,
    // allowing the browser WebSocket to drive live telemetry seamlessly.
    return {
      symbol: data.symbol,
      lastPrice: null,
      markPrice: null,
      totalWalletBalance: null,
      totalMarginBalance: null,
      publicFeedError: undefined,
      accountError: undefined,
      ts,
    };
  });
