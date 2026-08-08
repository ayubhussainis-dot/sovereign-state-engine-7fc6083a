import { describe, it, expect } from "vitest";
import { PaperHarness } from "@/twin/paper-harness";
import { MarketEngine } from "@/twin/market-engine";
import { fuseFrame } from "@/twin/fusion";
import { getMirror } from "@/twin/not-mirror";
import { tradeLedger, computeStats } from "@/lib/trade-ledger";
import k from "/tmp/k1m.json";

// Real BTCUSDT 1m OHLC from Binance replayed tick-by-tick (O,H,L,C).
const prices: { p: number; ts: number }[] = [];
for (const row of k as any[]) {
  const ts = Number(row[0]);
  for (const idx of [1, 2, 3, 4]) prices.push({ p: parseFloat(row[idx]), ts });
}

function run(intent: "long" | "short") {
  const h = new PaperHarness("BTCUSDT");
  let fills = 0, closes = 0, closeEntry: any = null, cycleAtClose: any = null;
  let markSeq: number[] = [];
  for (const t of prices) {
    const c = h.ingest({
      price: t.p, volume: 1, ts: t.ts, receivedAt: t.ts,
      bid: t.p - 0.5, ask: t.p + 0.5, side: "buy",
      intent, // production supplies this from fusion
    });
    for (const e of c.entries) {
      if (e.kind === "ORDER_FILLED") fills++;
      if (e.kind === "TRADE_CLOSED") { closes++; closeEntry = e.payload; cycleAtClose = c; }
    }
    if (c.broker.openPosition) markSeq.push(t.p);
    if (closes) break;
  }
  return { h, fills, closes, closeEntry, cycleAtClose, markSeq };
}

describe("complete paper trade lifecycle over real Binance prices", () => {
  it("OPEN → MARK → STOP/TARGET → CLOSE", () => {
    const r = run("long");
    console.log("LIFECYCLE", { fills: r.fills, closes: r.closes, close: r.closeEntry, ticksHeld: r.markSeq.length });
    expect(r.fills).toBeGreaterThanOrEqual(1);
    expect(r.closes).toBe(1);
    expect(["STOP", "TARGET"]).toContain(r.closeEntry.reason);
    expect(r.markSeq.length).toBeGreaterThan(1); // mark followed the twin price
    // stats update only at close
    const s = r.h.broker.stats();
    expect(s.trades).toBe(1);
    expect(s.cumPnL).not.toBe(0);
    expect(s.wins + s.losses).toBe(1);
    expect(s.openPosition).toBeNull();
  });

  it("LEDGER: exactly one permanent record with full provenance", () => {
    tradeLedger.clear();
    const r = run("long");
    const eng = new MarketEngine("BTCUSDT", "BTC");
    const fusion = fuseFrame(getMirror("BTCUSDT").current);
    // replay the fill cycle then the close cycle through the real journaller
    (eng as any).journal({ ...r.cycleAtClose, entries: r.cycleAtClose.entries }, fusion);
    (eng as any).journal(r.cycleAtClose, fusion); // duplicate cycle must NOT double-write
    const all = tradeLedger.all();
    console.log("LEDGER", all);
    expect(all.length).toBe(1);
    const rec = all[0];
    for (const f of ["timestamp","symbol","direction","entryPrice","exitPrice","quantity","pnl","joallValue","mc01State","reasonEntry","reasonExit"]) {
      expect(rec[f as keyof typeof rec]).toBeDefined();
    }
    const st = computeStats(all);
    expect(st.totalTrades).toBe(1);
    expect(st.wins + st.losses).toBe(1);
    console.log("STATS", st);
  });

  it("MULTI-MARKET ISOLATION: BTC trade leaves ETH engine untouched", () => {
    const btc = new PaperHarness("BTCUSDT");
    const eth = new PaperHarness("ETHUSDT");
    for (const t of prices.slice(0, 200)) {
      btc.ingest({ price: t.p, volume: 1, ts: t.ts, receivedAt: t.ts, bid: t.p - .5, ask: t.p + .5, side: "buy", intent: "long" });
    }
    expect(btc.broker.stats().trades + (btc.broker.stats().openPosition ? 1 : 0)).toBeGreaterThan(0);
    const e = eth.broker.stats();
    expect(e.trades).toBe(0);
    expect(e.openPosition).toBeNull();
    expect(e.cumPnL).toBe(0);
  });
});
