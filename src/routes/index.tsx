import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RihalDashboard } from "@/components/RihalDashboard";
import type { SDTState, TelemetryData } from "@/lib/SDTStateEngine";
import type { Decision } from "@/engine/decision/types";
import { getFuturesTelemetry, type FuturesTelemetrySnapshot } from "@/lib/binance.functions";
import { useMarkets } from "@/hooks/use-markets";
import { MARKETS, getEngine } from "@/twin/markets";
import EngineClock from "@/components/EngineClock";

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
  const [selected, setSelected] = useState<string>("BTCUSDT");
  const markets = useMarkets(mode === "PAPER_TESTNET");
  const sel = useMemo(
    () => markets.find((m) => m.symbol === selected) ?? markets[0],
    [markets, selected],
  );
  const cycle = sel?.cycle ?? null;
  const mirror = sel?.frame;
  const fusion = sel?.fusion;

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
      <EngineClock />

      <RihalDashboard
        currentState={state}
        telemetry={{
          ...telemetry,
          edartradeSignal: futures?.edartradeSignal,
        }}
        zScore={zScore}
        sMultiplier={sMultiplier}
      />
      <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest flex flex-wrap gap-x-6 gap-y-1">
        <span className="text-zinc-500">BINANCE FUTURES TESTNET · {sel?.label ?? "—"}</span>
        <span className="text-zinc-400">
          TWIN LAST (pipeline):{" "}
          {cycle?.twin.last?.price != null ? (
            <span className="text-emerald-400">
              {cycle.twin.last.price.toFixed(2)}
            </span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
          <span className="text-zinc-600">
            {" "}
            [seq {cycle?.twin.last?.twinSeq ?? "—"}]
          </span>
        </span>
        <span className="text-zinc-400">
          WS RAW (pre-twin):{" "}
          {mirror && mirror.lastPrice > 0 ? (
            <span className="text-zinc-200">{mirror.lastPrice.toFixed(2)}</span>
          ) : futures?.lastPrice != null ? (
            <span className="text-zinc-200">{futures.lastPrice.toFixed(2)}</span>
          ) : (
            <span className="text-amber-400">—</span>
          )}
          <span className="text-zinc-600">
            {" "}
            [WS {mirror?.connected ? "open" : "connecting"}]
          </span>
        </span>
        <span className="text-zinc-400">
          LIVE TICKS:{" "}
          {(sel?.ticks ?? 0) > 0 ? (
            <span className="text-emerald-400">YES [{sel?.ticks}]</span>
          ) : (
            <span className="text-amber-400">NO</span>
          )}
        </span>
        <span className="text-zinc-400">
          MARK (REST acct):{" "}
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
        <Link
          to="/journal"
          className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:bg-zinc-900 transition-colors"
        >
          TRADE LEDGER →
        </Link>
      </div>
      {standby && (
        <div className="font-mono text-[10px] tracking-widest text-amber-500/80">
          SYSTEM STANDBY — SELECT FEED MODE ABOVE
        </div>
      )}
      {mode === "PAPER_TESTNET" && (
        <div className="w-full max-w-4xl flex flex-wrap gap-2 font-mono text-[10px] tracking-widest">
          {MARKETS.map((m) => {
            const snap = markets.find((s) => s.symbol === m.symbol);
            const active = selected === m.symbol;
            const open = snap?.cycle?.broker.openPosition ?? null;
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
                <span
                  className={
                    open
                      ? open.side === "long"
                        ? " text-emerald-400"
                        : " text-red-400"
                      : " text-zinc-700"
                  }
                >
                  {" "}
                  {open ? (open.side === "long" ? "▲" : "▼") : "·"}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {mode === "PAPER_TESTNET" && (
        <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest overflow-x-auto">
          <div className="text-zinc-500 mb-2">MARKET OVERVIEW · INDEPENDENT ENGINES</div>
          <table className="w-full min-w-[720px] text-left">
            <thead className="text-zinc-600">
              <tr>
                <th className="py-1 pr-3 font-normal">MARKET</th>
                <th className="py-1 pr-3 font-normal">POSITION</th>
                <th className="py-1 pr-3 font-normal">AUTHORITY</th>
                <th className="py-1 pr-3 font-normal">FUSION</th>
                <th className="py-1 pr-3 font-normal">OPEN</th>
                <th className="py-1 pr-3 font-normal">W</th>
                <th className="py-1 pr-3 font-normal">L</th>
                <th className="py-1 pr-3 font-normal">REALIZED</th>
                <th className="py-1 pr-3 font-normal">UNREALIZED</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => {
                const b = m.cycle?.broker;
                const pos = b?.openPosition ?? null;
                const report = m.cycle?.report;
                const authority = report
                  ? report.failedAt
                    ? "VETO"
                    : report.tradeArmed
                      ? "ARMED"
                      : "STANDBY"
                  : m.connected
                    ? "WARMING"
                    : "OFFLINE";
                return (
                  <tr
                    key={m.symbol}
                    onClick={() => setSelected(m.symbol)}
                    className={`cursor-pointer border-t border-zinc-900 ${
                      selected === m.symbol ? "bg-zinc-900/60" : "hover:bg-zinc-900/30"
                    }`}
                  >
                    <td className="py-1 pr-3 text-zinc-200">{m.label}</td>
                    <td className="py-1 pr-3">
                      {pos ? (
                        <span
                          className={
                            pos.side === "long" ? "text-emerald-400" : "text-red-400"
                          }
                        >
                          {pos.side.toUpperCase()} @ {pos.entry.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-zinc-600">FLAT</span>
                      )}
                    </td>
                    <td
                      className={`py-1 pr-3 ${
                        authority === "ARMED"
                          ? "text-emerald-400"
                          : authority === "VETO"
                            ? "text-red-400"
                            : "text-amber-400"
                      }`}
                    >
                      {authority}
                    </td>
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
                    <td className="py-1 pr-3 text-zinc-300">{pos ? 1 : 0}</td>
                    <td className="py-1 pr-3 text-emerald-400">{b?.wins ?? 0}</td>
                    <td className="py-1 pr-3 text-red-400">{b?.losses ?? 0}</td>
                    <td
                      className={`py-1 pr-3 ${
                        (b?.cumPnL ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {(b?.cumPnL ?? 0) >= 0 ? "+" : ""}
                      {(b?.cumPnL ?? 0).toFixed(4)}
                    </td>
                    <td
                      className={`py-1 pr-3 ${
                        m.unrealizedPnL > 0
                          ? "text-emerald-400"
                          : m.unrealizedPnL < 0
                            ? "text-red-400"
                            : "text-zinc-600"
                      }`}
                    >
                      {m.unrealizedPnL >= 0 ? "+" : ""}
                      {m.unrealizedPnL.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!standby && mirror && fusion && (
        <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest space-y-1">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-zinc-500">N.O.T · TWO-WAY MIRROR · {sel?.label}</span>
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
              <span className="text-zinc-200">
                {getEngine(selected).harness.ledger.head()}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {cycle.report.outcomes.map((o) => (
              <span
                key={o.gate}
                className={`px-2 py-1 border ${
                  o.hardVeto && !o.passed
                    ? "border-red-900 text-red-400"
                    : o.score >= 0.66
                    ? "border-emerald-900 text-emerald-400"
                    : o.score >= 0.33
                    ? "border-amber-900 text-amber-400"
                    : "border-zinc-800 text-zinc-500"
                }`}
                title={o.reason}
              >
                {o.gate.replace("_", " ")} {o.score.toFixed(2)}
              </span>
            ))}
          </div>
          <div>
            COMPOSITE: <span className="text-zinc-200">{cycle.report.compositeScore.toFixed(3)}</span>
            {" / "}
            <span className="text-zinc-500">{cycle.report.compositeThreshold.toFixed(2)}</span>
            {"  ·  "}
            AUTHORITY:{" "}
            {cycle.report.failedAt ? (
              <span className="text-red-400">HARD VETO · {cycle.report.failedAt}</span>
            ) : cycle.report.tradeArmed ? (
              <span className="text-emerald-400">ARMED · paper execution live</span>
            ) : (
              <span className="text-amber-400">
                STANDBY · composite below threshold
              </span>
            )}
          </div>
        </div>
      )}
      {mode === "PAPER_TESTNET" && cycle && (
        <div className="w-full max-w-4xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest space-y-1">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-emerald-400">
              PAPER BROKER · {sel?.label} · LIVE TICKS · NO BROKER CALLS
            </span>
            <span className="text-zinc-400">
              TRADES: <span className="text-zinc-200">{cycle.broker.trades}</span>
            </span>
            <span className="text-zinc-400">
              WINS: <span className="text-emerald-400">{cycle.broker.wins}</span>
            </span>
            <span className="text-zinc-400">
              LOSSES: <span className="text-red-400">{cycle.broker.losses}</span>
            </span>
            <span className="text-zinc-400">
              WIN%: <span className="text-zinc-200">{(cycle.broker.winRate * 100).toFixed(1)}%</span>
            </span>
            <span className="text-zinc-400">
              CUM PnL:{" "}
              <span className={cycle.broker.cumPnL >= 0 ? "text-emerald-400" : "text-red-400"}>
                {cycle.broker.cumPnL >= 0 ? "+" : ""}
                {cycle.broker.cumPnL.toFixed(4)} USDT
              </span>
            </span>
            <span className="text-zinc-400">
              UNREALIZED:{" "}
              <span
                className={
                  (sel?.unrealizedPnL ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }
              >
                {(sel?.unrealizedPnL ?? 0) >= 0 ? "+" : ""}
                {(sel?.unrealizedPnL ?? 0).toFixed(4)} USDT
              </span>
            </span>
          </div>
          {cycle.broker.openPosition ? (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-zinc-400">
              <span>
                OPEN #{cycle.broker.openPosition.id}{" "}
                <span
                  className={
                    cycle.broker.openPosition.side === "long"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {cycle.broker.openPosition.side.toUpperCase()}
                </span>
              </span>
              <span>ENTRY: <span className="text-zinc-200">{cycle.broker.openPosition.entry.toFixed(2)}</span></span>
              <span>STOP: <span className="text-red-400">{cycle.broker.openPosition.stop.toFixed(2)}</span></span>
              <span>TGT: <span className="text-emerald-400">{cycle.broker.openPosition.target.toFixed(2)}</span></span>
              <span>QTY: <span className="text-zinc-200">{cycle.broker.openPosition.qty.toFixed(6)}</span></span>
              <span>MARK (twin): <span className="text-zinc-200">{cycle.twin.last?.price.toFixed(2) ?? "—"}</span></span>
            </div>
          ) : (
            <div className="text-zinc-500">
              FLAT — BLOCKED BY:{" "}
              <span className="text-amber-400">
                {String(
                  [...cycle.entries]
                    .reverse()
                    .find((e) => e.kind === "EXEC_BLOCK")?.payload.blockedBy ??
                    "—",
                )}
              </span>
            </div>
          )}
          {cycle.broker.lastTrade && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-zinc-500">
              <span>LAST #{cycle.broker.lastTrade.id}</span>
              <span>{cycle.broker.lastTrade.side.toUpperCase()}</span>
              <span>E {cycle.broker.lastTrade.entry.toFixed(2)}</span>
              <span>X {cycle.broker.lastTrade.exit.toFixed(2)}</span>
              <span>{cycle.broker.lastTrade.reason}</span>
              <span className={cycle.broker.lastTrade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                {cycle.broker.lastTrade.pnl >= 0 ? "+" : ""}
                {cycle.broker.lastTrade.pnl.toFixed(4)} USDT
              </span>
            </div>
          )}
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
