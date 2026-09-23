import { runPipeline, type PipelineInputs } from "./pipeline";

export interface Env {
  BINANCE_TESTNET_API_KEY: string;
  BINANCE_TESTNET_API_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      let inputs: PipelineInputs;

      if (request.method === "POST") {
        inputs = await request.json();
      } else {
        return new Response(
          JSON.stringify({ error: "Method not allowed. Send POST with PipelineInputs." }),
          { status: 405, headers: { "Content-Type": "application/json" } }
        );
      }

      // 1. Evaluate deterministic G1 -> G8 pipeline
      const report = runPipeline(inputs);

      let exchangeExecution: unknown = null;

      // 2. Dispatch live orders to Binance Testnet when G8 authority triggers
      if (report.engineAction === "OPEN" || report.engineAction === "CLOSE") {
        const isLong = inputs.risk.positionSide === "long";
        const isOpening = report.engineAction === "OPEN";

        // Long Open = BUY  | Long Close = SELL
        // Short Open = SELL | Short Close = BUY
        const side = isOpening
          ? isLong
            ? "BUY"
            : "SELL"
          : isLong
          ? "SELL"
          : "BUY";

        const orderParams: Record<string, string> = {
          symbol: "BTCUSDT",
          side,
          type: "MARKET",
          quantity: "0.001",
          ...(isOpening ? {} : { reduceOnly: "true" }),
        };

        if (env.BINANCE_TESTNET_API_KEY && env.BINANCE_TESTNET_API_SECRET) {
          exchangeExecution = await sendBinanceTestnetOrder(env, orderParams);
        } else {
          console.warn("Binance Testnet credentials missing in Cloudflare environment bindings.");
        }
      }

      return new Response(
        JSON.stringify({
          ...report,
          exchangeExecution,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return new Response(
        JSON.stringify({ error: "Internal Execution Error", details: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

/**
 * Authenticated REST Dispatcher for Binance Futures Testnet
 * Computes HMAC SHA-256 signature and posts directly to the matching engine.
 */
async function sendBinanceTestnetOrder(
  env: Env,
  params: Record<string, string>
): Promise<unknown> {
  const baseUrl = "https://testnet.binancefuture.com";
  const endpoint = "/fapi/v1/order";
  const timestamp = Date.now().toString();

  const queryParams = new URLSearchParams({
    ...params,
    timestamp,
  });

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.BINANCE_TESTNET_API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(queryParams.toString())
  );

  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const fullUrl = `${baseUrl}${endpoint}?${queryParams.toString()}&signature=${signature}`;

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "X-MBX-APIKEY": env.BINANCE_TESTNET_API_KEY,
    },
  });

  return await response.json();
}
