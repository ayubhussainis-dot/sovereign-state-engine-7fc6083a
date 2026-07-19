/// <reference lib="webworker" />
import { SDTStateEngine, type TelemetryData, type RiskProfile, type SDTState } from "@/lib/SDTStateEngine";
import { appendLedger } from "@/lib/ledger";
import { DecisionEngine } from "@/engine/modules/decision-engine";
import type { Decision } from "@/engine/decision/types";
import type { OHLCBar } from "@/engine/market-structure/types";

type InMsg =
  | { type: "INIT"; risk: RiskProfile }
  | { type: "TELEMETRY"; telemetry: TelemetryData }
  | { type: "SHOCK" }
  | { type: "DRAWDOWN" }
  | { type: "RESET" };

type OutMsg =
  | { type: "STATE"; state: SDTState; zScore: number; sMultiplier: number; telemetry: TelemetryData }
  | { type: "TRANSITION"; from: SDTState; to: SDTState; ts: number }
  | { type: "DECISION"; decision: Decision };

let engine: SDTStateEngine | null = null;
const decisionEngine = new DecisionEngine();
const BAR_MS = 1000;
const MAX_BARS = 400;
const bars: OHLCBar[] = [];
let currentBar: OHLCBar | null = null;
let lastDecisionAt = 0;
const SYMBOL = "SIM";

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
    engine = new SDTStateEngine(msg.risk, (from, to) => {
      const ts = Date.now();
      appendLedger({ kind: "STATE_TRANSITION", from, to, ts });
      post({ type: "TRANSITION", from, to, ts });
    });
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