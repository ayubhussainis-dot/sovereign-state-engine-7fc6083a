import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RihalDashboard } from "@/components/RihalDashboard";
import type { SDTState, TelemetryData } from "@/lib/SDTStateEngine";
import type { Decision } from "@/engine/decision/types";
import { getFuturesTelemetry, executeDirectOrder, getActivePosition, type FuturesTelemetrySnapshot } from "@/lib/binance.functions";
import { useMarkets } from "@/hooks/use-markets";
import { MARKETS } from "@/twin/markets";
import EngineClock from "@/components/EngineClock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "J.O.ALL — Jack of All" },
      {
        name: "description",
        content: "J.O.ALL autonomous direct execution terminal — Market Digital Twin, PPG telemetry, and SOALL governance over Binance Futures Testnet.",
      },
      { name: "author", content: "Ayub Abdul Hussain — AYUBHUSSAINOID" },
      { property: "og:title", content: "J.O.ALL — Jack of All" },
      { property: "og:description", content: "Deterministic Market Digital Twin with autonomous p53 checkpoint governance and direct Binance Testnet execution handshake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Mode = "STANDBY" | "SIMULATED" | "DIRECT_TESTNET";

function Index() {
  const [state, setState] = useState<SDTState>("G0_HOMEOSTASIS");
  const [mode, setMode] = useState<Mode>("DIRECT_TESTNET");
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
  const [positionMetrics, setPositionMetrics] = useState<any>(null);

  const workerRef = useRef<Worker | null>(null);
  const [futures, setFutures] = useState<FuturesTelemetrySnapshot | null>(null);
  const [futuresError, setFuturesError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("BTCUSDT");

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem("binance_testnet_key") ?? "");
  const [apiSecret, setApiSecret] = useState<string>(() => localStorage.getItem("binance_testnet_secret") ?? "");
  const [executing, setExecuting] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<any | null>(null);
  const [lastTriggeredVerdict, setLastTriggeredVerdict] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("binance_testnet_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("binance_testnet_secret", apiSecret);
  }, [apiSecret]);

  const markets = useMarkets(mode === "DIRECT_TESTNET");
  const sel = useMemo(
    () => markets.find((m) => m.symbol === selected) ?? markets[0],
    [markets, selected],
  );
  const cycle = sel?.cycle ?? null;
  const mirror = sel?.frame;
  const fusion = sel?.fusion;

  // Polls the server-side position function every 2 seconds for whichever asset tab is selected
  useEffect(() => {
    if (mode !== "DIRECT_TESTNET" || !apiKey || !apiSecret) return;
    
    let active = true;
    const pollPosition = async () => {
      try {
        const metrics = await getActivePosition({
          data: {
            symbol: selected,
            apiKey,
            apiSecret
          }
        });
        
        if (active && metrics) {
          setPositionMetrics(metrics);
        } else if (active && !metrics) {
          setPositionMetrics(null);
        }
      } catch (e) {
        console.error("Failed to poll position", e);
      }
    };

    pollPosition(); 
    const id = setInterval(pollPosition, 2000);
    
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [mode, selected, apiKey, apiSecret]);

  useEffect(() => {
    if (mode === "STANDBY") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const livePrice =
          mirror && mirror.lastPrice > 0
            ? mirror.lastPrice
            : cycle?.twin.last?.price ?? telemetry.currentPrice;
        const snap = await getFuturesTelemetry({
          data: { symbol: selected, currentPrice: livePrice },
        });
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
  }, [mode, selected, mirror?.lastPrice, cycle?.twin.last?.price, telemetry.currentPrice]);

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
      }
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

  useEffect(() => {
    if (mode !== "DIRECT_TESTNET" || !fusion || !apiKey || !apiSecret) return;

    const verdict = fusion.verdict;
    if (verdict === "LOCKED-BULL" && lastTriggeredVerdict !== "LOCKED-BULL") {
      setLastTriggeredVerdict("LOCKED-BULL");
      executeAutonomousOrder("BUY");
    } else if (verdict === "LOCKED-BEAR" && lastTriggeredVerdict !== "LOCKED-BEAR") {
      setLastTriggeredVerdict("LOCKED-BEAR");
      executeAutonomousOrder("SELL");
    }
  }, [fusion?.verdict, mode, apiKey, apiSecret, lastTriggeredVerdict, selected]);

  const executeAutonomousOrder = async (side: "BUY" | "SELL") => {
    setExecuting(true);
    setExecResult(null);
    try {
      const res = await executeDirectOrder({
        data: {
          symbol: selected,
          side,
          quantity: 0.002,
          apiKey,
          apiSecret,
        },
      });
      setExecResult({ timestamp: new Date().toISOString(), side, result: res });
    } catch (err: any) {
      setExecResult({ error: err.message });
    } finally {
      setExecuting(false);
    }
  };

  const isDev = import.meta.env.DEV;

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-4">
      <EngineClock />

      <RihalDashboard
        currentState={state}
        telemetry={{
          ...telemetry,
          edartradeSignal: futures?.edartradeSignal,
        }}
        zScore={zScore}
        sMultiplier={sMultiplier}
        positionMetrics={positionMetrics}
      />

      {/* Live Ticks & Pipeline Header */}
      <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest flex flex-wrap gap-x-6 gap-y-1">
        <span className="text-zinc-500">BINANCE FUTURES TESTNET · {sel?.label ?? "—"}</span>
        <span className="text-zinc-400">
          TWIN LAST (pipeline):{" "}
          {cycle?.twin.last?.price != null ? (
            <span className="text-emerald-400">{cycle.twin.last.price.toFixed(2)}</span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </span>
        <span className="text-zinc-400">
          WS RAW (pre-twin):{" "}
          {mirror && mirror.lastPrice > 0 ? (
            <span className="text-zinc-200">{mirror.lastPrice.toFixed(2)}</span>
          ) : (
            <span className="text-amber-400">—</span>
          )}
        </span>
        <span className="text-zinc-400">
          LIVE TICKS: {(sel?.ticks ?? 0) > 0 ? <span className="text-emerald-400">YES [{sel?.ticks}]</span> : <span className="text-amber-400">NO</span>}
        </span>
      </div>

      {/* Mode Selectors */}
      <div className="w-full max-w-4xl flex flex-wrap gap-2 font-mono text-[10px] tracking-widest">
        {(["STANDBY", "SIMULATED", "DIRECT_TESTNET"] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-2 border transition-colors ${
                active
                  ? m === "DIRECT_TESTNET"
                    ? "border-emerald-700 text-emerald-300 bg-emerald-950/40"
                    : m === "SIMULATED"
                      ? "border-zinc-600 text-zinc-100 bg-zinc-900"
                      : "border-amber-800 text-amber-300 bg-amber-950/40"
                  : "border-zinc-800 text-zinc-500 hover:bg-zinc-900"
              }`}
            >
              {m === "DIRECT_TESTNET" ? "AUTONOMOUS DIRECT TESTNET" : m.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* Autonomous Handshake Panel with Saved Keys */}
      {mode === "DIRECT_TESTNET" && (
        <div className="w-full max-w-4xl border border-emerald-900/60 p-4 font-mono text-[10px] tracking-widest space-y-3 bg-zinc-950">
          <div className="text-emerald-400 font-bold">AUTONOMOUS EXCHANGE HANDSHAKE [KEYS SAVED LOCALLY]</div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              placeholder="Binance Testnet API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 bg-black border border-zinc-800 p-2 text-zinc-200 focus:border-emerald-700 outline-none"
            />
            <input
              type="password"
              placeholder="Binance Testnet API Secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="flex-1 bg-black border border-zinc-800 p-2 text-zinc-200 focus:border-emerald-700 outline-none"
            />
          </div>
          <div className="text-zinc-400 flex items-center justify-between">
            <span>Status: <span className={executing ? "text-amber-400 animate-pulse" : "text-emerald-400"}>{executing ? "FIRING ORDER..." : "ARMED & LISTENING FOR VERDICT"}</span></span>
            <span>Target Asset: {selected}</span>
          </div>
          {execResult && (
            <div className="p-2 bg-black border border-zinc-800 text-zinc-300 overflow-x-auto">
              <pre>{JSON.stringify(execResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Symbol Selectors */}
      {mode === "DIRECT_TESTNET" && (
        <div className="w-full max-w-4xl flex flex-wrap gap-2 font-mono text-[10px] tracking-widest">
          {MARKETS.map((m) => {
            const active = selected === m.symbol;
            return (
              <button
                key={m.symbol}
                type="button"
                onClick={() => setSelected(m.symbol)}
                className={`px-3 py-2 border transition-colors ${
                  active
                    ? "border-emerald-700 text-emerald-300 bg-emerald-950/40"
                    : "border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                }`}
              >
                {m.base}
              </button>
            );
          })}
        </div>
      )}

      {/* Market Overview Table */}
      {mode === "DIRECT_TESTNET" && (
        <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest overflow-x-auto">
          <div className="text-zinc-500 mb-2">MARKET OVERVIEW · INDEPENDENT ENGINES</div>
          <table className="w-full min-w-[720px] text-left">
            <thead className="text-zinc-600">
              <tr>
                <th className="py-1 pr-3 font-normal">MARKET</th>
                <th className="py-1 pr-3 font-normal">AUTHORITY</th>
                <th className="py-1 pr-3 font-normal">FUSION VERDICT</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => {
                return (
                  <tr
                    key={m.symbol}
                    onClick={() => setSelected(m.symbol)}
                    className={`cursor-pointer border-t border-zinc-900 ${
                      selected === m.symbol ? "bg-zinc-900/60" : "hover:bg-zinc-900/30"
                    }`}
                  >
                    <td className="py-1 pr-3 text-zinc-200">{m.label}</td>
                    <td className="py-1 pr-3 text-emerald-400">ARMED</td>
                    <td
                      className={`py-1 pr-3 ${
                        m.fusion.verdict === "LOCKED-BULL"
                          ? "text-emerald-400"
                          : m.fusion.verdict === "LOCKED-BEAR"
                            ? "text-red-400"
                            : m.fusion.verdict === "SPLIT"
                              ? "text-amber-300"
                              : "text-zinc-600"
                      }`}
                    >
                      {m.fusion.verdict}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Two-Way Mirror Details */}
      {!standby && mirror && fusion && (
        <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest space-y-1">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-zinc-500">N.O.T · TWO-WAY MIRROR · {sel?.label}</span>
            <span className="text-zinc-500">WS {mirror.connected ? <span className="text-emerald-400">LIVE</span> : <span className="text-amber-400">CONNECTING</span>}</span>
            <span className="text-zinc-400">SPREAD: <span className="text-zinc-200">{mirror.spreadBps.toFixed(2)} bps</span></span>
            <span className="text-zinc-400">VEL: <span className="text-zinc-200">{mirror.velocityBps.toFixed(2)} bps/s</span></span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-zinc-400">VERDICT: <span className={
              fusion.verdict === "LOCKED-BULL" ? "text-emerald-400" :
              fusion.verdict === "LOCKED-BEAR" ? "text-red-400" :
              fusion.verdict === "SPLIT" ? "text-amber-300" : "text-zinc-500"
            }>{fusion.verdict}</span></span>
          </div>
        </div>
      )}
    </main>
  );
}
