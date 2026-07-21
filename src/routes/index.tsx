import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RihalDashboard } from "@/components/RihalDashboard";
import type { SDTState, TelemetryData } from "@/lib/SDTStateEngine";
import type { Decision } from "@/engine/decision/types";
import { getFuturesTelemetry, type FuturesTelemetrySnapshot } from "@/lib/binance.functions";
import { useBinanceTrade } from "@/hooks/use-binance-feed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sovereign Deterministic Terminal" },
      {
        name: "description",
        content:
          "SDT — deterministic G0→G1→S→M state engine with p53 checkpoint governance and Rihal interlocking telemetry.",
      },
      { name: "author", content: "Ayub Abdul Hussain" },
      { property: "og:title", content: "Sovereign Deterministic Terminal" },
      {
        property: "og:description",
        content:
          "Deterministic cell-cycle state engine with p53 checkpoint governance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [state, setState] = useState<SDTState>("G0_HOMEOSTASIS");
  const [standby, setStandby] = useState(true);
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    currentPrice: 100,
    currentOfi: 0,
    liquidityDepth: 5000,
    volatility: 0.02,
  });
  const [zScore, setZScore] = useState(0);
  const [sMultiplier, setSMultiplier] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [futures, setFutures] = useState<FuturesTelemetrySnapshot | null>(null);
  const [futuresError, setFuturesError] = useState<string | null>(null);
  const wsTrade = useBinanceTrade("BTCUSDT");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const snap = await getFuturesTelemetry({ data: { symbol: "BTCUSDT" } });
        if (!cancelled) {
          setFutures(snap);
          setFuturesError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFuturesError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/sdt.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.postMessage({
      type: "INIT",
      risk: {
        equityHighWaterMark: 100000,
        currentEquity: 100000,
        baseLeverage: 2,
        zScoreThreshold: 2.5,
      },
    });

    worker.addEventListener("message", (ev: MessageEvent) => {
      const msg = ev.data;
      if (msg.type === "TRANSITION") {
        setState(msg.to);
      } else if (msg.type === "STATE") {
        setState(msg.state);
        setTelemetry(msg.telemetry);
        setZScore(msg.zScore);
        setSMultiplier(msg.sMultiplier);
      } else if (msg.type === "DECISION") {
        setDecision(msg.decision as Decision);
      }
    });

    let id = 0;
    if (!standby) {
      let price = 100;
      // 400 Hz AFC telemetry ingestion (2.5ms cadence)
      id = window.setInterval(() => {
        const shock = Math.random() < 0.02 ? (Math.random() - 0.5) * 4 : 0;
        price = price + (Math.random() - 0.5) * 0.2 + shock;
        const t: TelemetryData = {
          currentPrice: price,
          currentOfi: (Math.random() - 0.5) * 2000,
          liquidityDepth: 4000 + Math.random() * 3000,
          volatility: 0.01 + Math.random() * 0.05,
        };
        worker.postMessage({ type: "TELEMETRY", telemetry: t });
      }, 2.5);
    }

    return () => {
      if (id) window.clearInterval(id);
      worker.terminate();
    };
  }, [standby]);

  const isDev = import.meta.env.DEV;

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-4">
      <RihalDashboard
        currentState={state}
        telemetry={telemetry}
        zScore={zScore}
        sMultiplier={sMultiplier}
      />
      <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest flex flex-wrap gap-x-6 gap-y-1">
        <span className="text-zinc-500">BINANCE FUTURES TESTNET · BTCUSDT</span>
        <span className="text-zinc-400">
          LAST:{" "}
          {wsTrade.lastPrice != null ? (
            <span className="text-emerald-400">{wsTrade.lastPrice.toFixed(2)}</span>
          ) : futures?.lastPrice != null ? (
            <span className="text-emerald-400">{futures.lastPrice.toFixed(2)}</span>
          ) : (
            <span className="text-amber-400">—</span>
          )}
          <span className="text-zinc-600"> [WS {wsTrade.status}]</span>
        </span>
        <span className="text-zinc-400">
          MARK:{" "}
          {futures?.markPrice != null ? (
            <span className="text-emerald-400">{futures.markPrice.toFixed(2)}</span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </span>
        <span className="text-zinc-400">
          WALLET:{" "}
          {futures?.totalWalletBalance != null ? (
            <span className="text-zinc-200">{futures.totalWalletBalance.toFixed(2)}</span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </span>
        <span className="text-zinc-400">
          MARGIN:{" "}
          {futures?.totalMarginBalance != null ? (
            <span className="text-zinc-200">{futures.totalMarginBalance.toFixed(2)}</span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </span>
        {futures?.publicFeedError && (
          <span className="text-red-400">REST PUB {futures.publicFeedError}</span>
        )}
        {futures?.accountError && (
          <span className="text-red-400">REST ACCT {futures.accountError}</span>
        )}
        {futuresError && !futures && (
          <span className="text-red-400">FEED ERROR: {futuresError}</span>
        )}
      </div>
      <div className="w-full max-w-4xl flex flex-wrap gap-2 font-mono text-[10px] tracking-widest">
        <button
          type="button"
          onClick={() => setStandby((s) => !s)}
          className={`px-3 py-2 border transition-colors ${
            standby
              ? "border-amber-900 text-amber-400 hover:bg-amber-950/40"
              : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
          }`}
        >
          {standby ? "ENGAGE SIMULATED FEED" : "RETURN TO STANDBY"}
        </button>
        {isDev && (
          <>
            <button
              type="button"
              onClick={() => workerRef.current?.postMessage({ type: "SHOCK" })}
              className="px-3 py-2 border border-emerald-900 text-emerald-400 hover:bg-emerald-950/40 transition-colors"
            >
              INJECT SHOCK [Z &gt; 2.5]
            </button>
            <button
              type="button"
              onClick={() => workerRef.current?.postMessage({ type: "DRAWDOWN" })}
              className="px-3 py-2 border border-red-900 text-red-400 hover:bg-red-950/40 transition-colors"
            >
              FORCE DRAWDOWN [p53 ARREST]
            </button>
            <button
              type="button"
              onClick={() => workerRef.current?.postMessage({ type: "RESET" })}
              className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:bg-zinc-900 transition-colors"
            >
              RESET → G0
            </button>
          </>
        )}
      </div>
      {standby && (
        <div className="font-mono text-[10px] tracking-widest text-amber-500/80">
          SYSTEM STANDBY — AWAITING SECURE DATA FEED
        </div>
      )}
      {!standby && decision && (
        <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest text-zinc-400 flex flex-wrap gap-x-6 gap-y-1">
          <span>
            KERNEL BIAS:{" "}
            <span
              className={
                decision.bias === "long"
                  ? "text-emerald-400"
                  : decision.bias === "short"
                    ? "text-red-400"
                    : "text-zinc-500"
              }
            >
              {decision.bias.toUpperCase()}
            </span>
          </span>
          <span>CONFIDENCE: {(decision.confidence * 100).toFixed(1)}%</span>
          <span>SCORE: {decision.score.toFixed(3)}</span>
          <span>SIGNALS: {decision.signals.length}</span>
          {decision.plan && (
            <span>
              PLAN E:{decision.plan.entry.toFixed(2)} S:
              {decision.plan.stop.toFixed(2)} RR:{decision.plan.rr.toFixed(2)}
            </span>
          )}
        </div>
      )}
    </main>
  );
}
