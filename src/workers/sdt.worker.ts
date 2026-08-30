/// <reference lib="webworker" />
import { SDTStateEngine, type TelemetryData, type RiskProfile, type SDTState } from "@/lib/SDTStateEngine";
import { appendLedger } from "@/lib/ledger";
import { DecisionEngine } from "@/engine/modules/decision-engine";
import type { Decision } from "@/engine/decision/types";
import type { OHLCBar } from "@/engine/market-structure/types";

// --- 1. NEW: POSITION METRICS INTERFACE ---
export interface ActivePositionMetrics {
    hasPosition: boolean;
    positionAmt: number;
    entryPrice: number;
    unRealizedProfit: number;
    leverage: number;
}

type InMsg =
  // Added optional apiKey/apiSecret so your frontend can pass them to the worker
  | { type: "INIT"; risk: RiskProfile; apiKey?: string; apiSecret?: string }
  | { type: "TELEMETRY"; telemetry: TelemetryData }
  | { type: "SHOCK" }
  | { type: "DRAWDOWN" }
  | { type: "RESET" };

type OutMsg =
  | { type: "STATE"; state: SDTState; zScore: number; sMultiplier: number; telemetry: TelemetryData }
  | { type: "TRANSITION"; from: SDTState; to: SDTState; ts: number }
  | { type: "DECISION"; decision: Decision }
  // --- 2. NEW: OUTGOING MESSAGE FOR PNL UPDATE ---
  | { type: "POSITION"; data: ActivePositionMetrics | null };

let engine: SDTStateEngine | null = null;
const decisionEngine = new DecisionEngine();
const BAR_MS = 1000;
const MAX_BARS = 400;
const bars: OHLCBar[] = [];
let currentBar: OHLCBar | null = null;
let lastDecisionAt = 0;
const SYMBOL = "SIM";

// Credentials for tracking
let binanceKey = "";
let binanceSecret = "";
let isPollingPosition = false;

let lastTelemetry: TelemetryData = {
  currentPrice: 100,
  currentOfi: 0,
  liquidityDepth: 0,
  volatility: 0,
};

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: OutMsg) {
  ctx.postMessage(msg);
}

// --- 3. NEW: HMAC SIGNATURE FOR BINANCE IN WEB WORKER ---
async function generateSignature(queryString: string, secret: string) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- 4. NEW: POSITION POLLING FUNCTION ---
async function pollPosition() {
    if (!binanceKey || !binanceSecret) return;

    const targetAsset = "BTCUSDT"; // Hardcoded to match your engine target
    const endpoint = '/fapi/v2/positionRisk';
    const timestamp = Date.now();
    const queryString = `symbol=${targetAsset}&timestamp=${timestamp}`;
    
    try {
        const signature = await generateSignature(queryString, binanceSecret);
        const url = `https://testnet.binancefuture.com${endpoint}?${queryString}&signature=${signature}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': binanceKey,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        const position = data.find((p: any) => p.symbol === targetAsset);
        
        if (position) {
            post({
                type: "POSITION",
                data: {
                    hasPosition: parseFloat(position.positionAmt) !== 0,
                    positionAmt: parseFloat(position.positionAmt),
                    entryPrice: parseFloat(position.entryPrice),
                    unRealizedProfit: parseFloat(position.unRealizedProfit),
                    leverage: parseInt(position.leverage)
                }
            });
        }
    } catch (error) {
        console.error("Worker: Position Tracking Error:", error);
    }
}

function ingestTick(price: number, now: number) {
  const bucket = Math.floor(now / BAR_MS) * BAR_MS;
  if (!currentBar || currentBar.time !== bucket) {
    if (currentBar) {
      bars.push(currentBar);
      if (bars.length > MAX_BARS) bars.shift();
    }
    currentBar = { time: bucket, open: price, high: price, low: price, close: price };
  } else {
    currentBar.close = price;
    if (price > currentBar.high) currentBar.high = price;
    if (price < currentBar.low) currentBar.low = price;
  }
}

function maybeDecide(now: number) {
  if (bars.length < 60) return;
  if (now - lastDecisionAt < 1000) return;
  lastDecisionAt = now;
  try {
    const decision = decisionEngine.fromBars(SYMBOL, bars);
    post({ type: "DECISION", decision });
  } catch {
    // decision layer is best-effort; never break the tick loop
  }
}

ctx.addEventListener("message", (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  if (msg.type === "INIT") {
    // Capture API keys if provided from frontend
    if (msg.apiKey) binanceKey = msg.apiKey;
    if (msg.apiSecret) binanceSecret = msg.apiSecret;

    engine = new SDTStateEngine(msg.risk, (from, to) => {
      const ts = Date.now();
      appendLedger({ kind: "STATE_TRANSITION", from, to, ts });
      post({ type: "TRANSITION", from, to, ts });
    });

    // Start polling position every 2 seconds once initialized
    if (!isPollingPosition && binanceKey && binanceSecret) {
        isPollingPosition = true;
        setInterval(pollPosition, 2000); 
    }
    return;
  }
  if (!engine) return;

  switch (msg.type) {
    case "TELEMETRY":
      lastTelemetry = msg.telemetry;
      engine.step(msg.telemetry);
      {
        const now = Date.now();
        ingestTick(msg.telemetry.currentPrice, now);
        maybeDecide(now);
      }
      break;
    case "SHOCK":
      engine.injectShock();
      break;
    case "DRAWDOWN":
      engine.forceDrawdown();
      break;
    case "RESET":
      engine.resetEquity();
      break;
  }

  post({
    type: "STATE",
    state: engine.getCurrentState(),
    zScore: engine.getLastZScore(),
    sMultiplier: engine.getLastMultiplier(),
    telemetry: lastTelemetry,
  });
});

export {};
