import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RihalDashboard } from "@/components/RihalDashboard";
import type { SDTState, TelemetryData } from "@/lib/SDTStateEngine";
import type { Decision } from "@/engine/decision/types";
import { getFuturesTelemetry, type FuturesTelemetrySnapshot } from "@/lib/binance.functions";
import { useBinanceTrade } from "@/hooks/use-binance-feed";
import { PaperHarness, type HarnessCycle } from "@/twin/paper-harness";
import { useFusion } from "@/twin/fusion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "J.O.ALL — Jack of All" },
      {
        name: "description",
        content:
          "J.O.ALL paper trading terminal — Market Digital Twin, PPG telemetry, and SOALL 8-gate governance over Binance Futures Testnet.",
      },
      { name: "author", content: "Ayub Abdul Hussain — AYUBHUSSAINOID" },
      { property: "og:title", content: "J.O.ALL — Jack of All" },
      {
        property: "og:description",
        content:
          "Deterministic Market Digital Twin with p53 checkpoint governance and SOALL 8-gate audit pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Mode = "STANDBY" | "SIMULATED" | "PAPER_TESTNET";

function Index() {
  const [state, setState] = useState<SDTState>("G0_HOMEOSTASIS");
  const [mode, setMode] = useState<Mode>("PAPER_TESTNET");
  const standby = mode === "STANDBY";
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
  const harness = useMemo(() => new PaperHarness(), []);
  const [cycle, setCycle] = useState<HarnessCycle | null>(null);
  const { fusion, frame: mirror } = useFusion(200);

  useEffect(() => {
    if (mode === "STANDBY") return;
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
  }, [mode]);

  // PAPER_TESTNET: pipe live WS ticks through the MDT → PPG → SOALL pipeline.
  useEffect(() => {
    if (mode !== "PAPER_TESTNET") return;
    if (wsTrade.lastPrice == null || wsTrade.lastTs == null) return;
    const c = harness.ingest({
      price: wsTrade.lastPrice,
      volume: 0,
      ts: wsTrade.lastTs,
      receivedAt: Date.now(),
      bid: mirror.bid > 0 ? mirror.bid : futures?.markPrice ?? undefined,
      ask: mirror.ask > 0 ? mirror.ask : futures?.markPrice ?? undefined,
      side: fusion.verdict === "LOCKED-BULL" ? "buy" : fusion.verdict === "LOCKED-BEAR" ? "sell" : undefined,
    });
    setCycle(c);
  }, [mode, harness, wsTrade.lastPrice, wsTrade.lastTs, futures?.markPrice, mirror.bid, mirror.ask, fusion.verdict]);

  useEffect(() => {
    if (mode === "STANDBY") harness.reset();
  }, [mode, harness]);

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
    if (mode === "SIMULATED") {
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
  }, [mode]);

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
        {(["STANDBY", "SIMULATED", "PAPER_TESTNET"] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-2 border transition-colors ${
                active
                  ? m === "PAPER_TESTNET"
                    ? "border-emerald-700 text-emerald-300 bg-emerald-950/40"
                    : m === "SIMULATED"
                      ? "border-zinc-600 text-zinc-100 bg-zinc-900"
                      : "border-amber-800 text-amber-300 bg-amber-950/40"
                  : "border-zinc-800 text-zinc-500 hover:bg-zinc-900"
              }`}
            >
              {m === "PAPER_TESTNET" ? "PAPER TRADING · TESTNET" : m.replace("_", " ")}
            </button>
          );
        })}
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
          SYSTEM STANDBY — SELECT FEED MODE ABOVE
        </div>
      )}
      {!standby && (
        <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest space-y-1">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-zinc-500">N.O.T · TWO-WAY MIRROR</span>
            <span className="text-zinc-500">WS {mirror.connected ? <span className="text-emerald-400">LIVE</span> : <span className="text-amber-400">CONNECTING</span>}</span>
            <span className="text-zinc-400">SPREAD: <span className="text-zinc-200">{mirror.spreadBps.toFixed(2)} bps</span></span>
            <span className="text-zinc-400">VEL: <span className="text-zinc-200">{mirror.velocityBps.toFixed(2)} bps/s</span></span>
            <span className="text-zinc-400">FLOW: <span className="text-zinc-200">{mirror.orderFlow.toFixed(0)}</span></span>
            <span className="text-zinc-400">FUND: <span className="text-zinc-200">{mirror.fundingBps.toFixed(3)} bps</span></span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-zinc-500">NOT (book) axis: <span className="text-zinc-300">{fusion.not.axis.toFixed(0)} bps</span> · conf {(fusion.not.confidence * 100).toFixed(0)}%</span>
            <span className="text-zinc-500">TON (flow) axis: <span className="text-zinc-300">{fusion.ton.axis.toFixed(1)}%</span> · conf {(fusion.ton.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-zinc-400">CONSENSUS ↑ <span className="text-emerald-400">{(fusion.consensusBull * 100).toFixed(1)}%</span></span>
            <span className="text-zinc-400">CONSENSUS ↓ <span className="text-red-400">{(fusion.consensusBear * 100).toFixed(1)}%</span></span>
            <span className="text-zinc-400">AGREEMENT <span className="text-zinc-200">{(fusion.agreement * 100).toFixed(0)}%</span></span>
            <span className="text-zinc-400">RESIDUAL <span className="text-amber-300">{(fusion.residual * 100).toFixed(1)}%</span> [{fusion.residualOwner}]</span>
            <span className="text-zinc-400">VERDICT: <span className={
              fusion.verdict === "LOCKED-BULL" ? "text-emerald-400" :
              fusion.verdict === "LOCKED-BEAR" ? "text-red-400" :
              fusion.verdict === "SPLIT" ? "text-amber-300" : "text-zinc-500"
            }>{fusion.verdict}</span></span>
          </div>
        </div>
      )}
      {mode === "PAPER_TESTNET" && cycle && (
        <div className="w-full max-w-4xl border border-emerald-900/60 p-3 font-mono text-[10px] tracking-widest text-zinc-400 space-y-2">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-emerald-400">MDT · PAPER PIPELINE</span>
            <span>TWIN SEQ: {cycle.twin.last?.twinSeq ?? "—"}</span>
            <span>WINDOW: {cycle.twin.window.length}</span>
            <span>V: {cycle.ppg.volatility.value.toExponential(2)}</span>
            <span>Ω: {cycle.ppg.ofi.value.toFixed(3)}</span>
            <span>τ: {cycle.ppg.velocity.value.toFixed(4)}/ms</span>
            <span>Ψ: {cycle.ppg.wave.state}</span>
            <span>
              LEDGER HEAD:{" "}
              <span className="text-zinc-200">{harness.ledger.head()}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {cycle.report.outcomes.map((o) => (
              <span
                key={o.gate}
                className={`px-2 py-1 border ${
                  o.passed
                    ? "border-emerald-900 text-emerald-400"
                    : "border-red-900 text-red-400"
                }`}
                title={o.reason}
              >
                {o.gate.replace("_", " ")} {o.passed ? "✓" : "✗"}
              </span>
            ))}
          </div>
          <div>
            AUTHORITY:{" "}
            {cycle.report.allPassed ? (
              <span className="text-emerald-400">
                GRANTED · ORDER_INTENT logged (paper — no execution)
              </span>
            ) : (
              <span className="text-red-400">
                VETO at {cycle.report.failedAt}
              </span>
            )}
          </div>
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
