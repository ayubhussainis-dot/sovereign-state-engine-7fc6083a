/// <reference lib="webworker" />
import { SDTStateEngine, type TelemetryData, type RiskProfile, type SDTState } from "@/lib/SDTStateEngine";
import { appendLedger } from "@/lib/ledger";

type InMsg =
  | { type: "INIT"; risk: RiskProfile }
  | { type: "TELEMETRY"; telemetry: TelemetryData }
  | { type: "SHOCK" }
  | { type: "DRAWDOWN" }
  | { type: "RESET" };

type OutMsg =
  | { type: "STATE"; state: SDTState; zScore: number; sMultiplier: number; telemetry: TelemetryData }
  | { type: "TRANSITION"; from: SDTState; to: SDTState; ts: number };

let engine: SDTStateEngine | null = null;
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