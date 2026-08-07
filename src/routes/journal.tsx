import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  computeStats,
  downloadCSV,
  tradeLedger,
  type JournalRecord,
} from "@/lib/trade-ledger";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Trade Ledger — J.O.ALL Trading Journal" },
      {
        name: "description",
        content:
          "Permanent audit ledger of every J.O.ALL paper trade: entry, exit, P&L, JOALL value, MC01 state, EYE vessel energy and entry/exit reasoning.",
      },
      { name: "author", content: "Ayub Abdul Hussain — AYUBHUSSAINOID" },
      { property: "og:title", content: "Trade Ledger — J.O.ALL Trading Journal" },
      {
        property: "og:description",
        content:
          "Permanent audit ledger and statistics for the J.O.ALL deterministic paper trading engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JournalPage,
});

const fmt = (n: number, d = 2) =>
  Number.isFinite(n) ? n.toFixed(d) : "∞";

function JournalPage() {
  const [records, setRecords] = useState<readonly JournalRecord[]>([]);
  const [symbol, setSymbol] = useState<string>("ALL");

  useEffect(() => {
    setRecords([...tradeLedger.all()]);
    return tradeLedger.subscribe((r) => setRecords([...r]));
  }, []);

  const symbols = useMemo(
    () => ["ALL", ...Array.from(new Set(records.map((r) => r.symbol))).sort()],
    [records],
  );
  const filtered = useMemo(
    () =>
      (symbol === "ALL" ? records : records.filter((r) => r.symbol === symbol))
        .slice()
        .sort((a, b) => b.closedAt - a.closedAt),
    [records, symbol],
  );
  const stats = useMemo(() => computeStats(filtered), [filtered]);

  return (
    <main className="min-h-screen bg-black text-zinc-300 flex flex-col items-center gap-4 p-4">
      <header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-widest">
        <h1 className="text-zinc-100">TRADE LEDGER · PERMANENT AUDIT JOURNAL</h1>
        <div className="flex gap-2">
          <Link
            to="/"
            className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:bg-zinc-900 transition-colors"
          >
            ← TERMINAL
          </Link>
          <button
            type="button"
            onClick={() => downloadCSV(filtered)}
            className="px-3 py-2 border border-emerald-900 text-emerald-400 hover:bg-emerald-950/40 transition-colors"
          >
            EXPORT CSV
          </button>
        </div>
      </header>

      <section className="w-full max-w-5xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-1">
        <div>TOTAL TRADES <span className="text-zinc-100">{stats.totalTrades}</span></div>
        <div>WINNING <span className="text-emerald-400">{stats.wins}</span></div>
        <div>LOSING <span className="text-red-400">{stats.losses}</span></div>
        <div>WIN RATE <span className="text-zinc-100">{fmt(stats.winRate * 100, 1)}%</span></div>
        <div>
          NET P&amp;L{" "}
          <span className={stats.netPnL >= 0 ? "text-emerald-400" : "text-red-400"}>
            {fmt(stats.netPnL, 4)}
          </span>
        </div>
        <div>AVG WIN <span className="text-emerald-400">{fmt(stats.avgWin, 4)}</span></div>
        <div>AVG LOSS <span className="text-red-400">{fmt(stats.avgLoss, 4)}</span></div>
        <div>PROFIT FACTOR <span className="text-zinc-100">{fmt(stats.profitFactor, 2)}</span></div>
        <div>MAX DRAWDOWN <span className="text-amber-400">{fmt(stats.maxDrawdown, 4)}</span></div>
        <div>USDT · REAL PAPER FILLS</div>
      </section>

      <div className="w-full max-w-5xl flex flex-wrap gap-2 font-mono text-[10px] tracking-widest">
        {symbols.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymbol(s)}
            className={`px-3 py-2 border ${
              symbol === s
                ? "border-zinc-600 text-zinc-100 bg-zinc-900"
                : "border-zinc-800 text-zinc-500 hover:bg-zinc-900"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <section className="w-full max-w-5xl border border-zinc-800 p-3 font-mono text-[10px] tracking-widest overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-zinc-500">
            NO CLOSED TRADES RECORDED YET — THE LEDGER FILLS ONLY FROM REAL PAPER
            EXECUTIONS.
          </p>
        ) : (
          <table className="w-full text-left whitespace-nowrap">
            <thead className="text-zinc-500">
              <tr>
                <th className="pr-4 pb-1">TIMESTAMP</th>
                <th className="pr-4 pb-1">SYMBOL</th>
                <th className="pr-4 pb-1">SIDE</th>
                <th className="pr-4 pb-1">ENTRY</th>
                <th className="pr-4 pb-1">EXIT</th>
                <th className="pr-4 pb-1">QTY</th>
                <th className="pr-4 pb-1">P&amp;L</th>
                <th className="pr-4 pb-1">JOALL</th>
                <th className="pr-4 pb-1">MC01</th>
                <th className="pr-4 pb-1">EYE</th>
                <th className="pr-4 pb-1">ENTRY REASON</th>
                <th className="pr-4 pb-1">EXIT REASON</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-zinc-900">
                  <td className="pr-4 py-1 text-zinc-500">
                    {new Date(r.timestamp).toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="pr-4 py-1 text-zinc-100">{r.symbol}</td>
                  <td
                    className={`pr-4 py-1 ${
                      r.direction === "BUY" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {r.direction}
                  </td>
                  <td className="pr-4 py-1">{fmt(r.entryPrice, 2)}</td>
                  <td className="pr-4 py-1">{fmt(r.exitPrice, 2)}</td>
                  <td className="pr-4 py-1">{fmt(r.quantity, 6)}</td>
                  <td
                    className={`pr-4 py-1 ${
                      r.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {fmt(r.pnl, 4)}
                  </td>
                  <td className="pr-4 py-1">{r.joallValue}/10</td>
                  <td className="pr-4 py-1 text-zinc-500">{r.mc01State}</td>
                  <td className="pr-4 py-1">{fmt(r.eyeEnergy, 1)}</td>
                  <td className="pr-4 py-1 text-zinc-500">{r.reasonEntry}</td>
                  <td className="pr-4 py-1 text-zinc-500">{r.reasonExit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="w-full max-w-5xl font-mono text-[10px] tracking-widest text-zinc-600">
        DESIGN PRINCIPAL · AYUB ABDUL HUSSAIN
      </footer>
    </main>
  );
}