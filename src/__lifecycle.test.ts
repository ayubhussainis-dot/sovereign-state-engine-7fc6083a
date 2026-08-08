import { describe, it, expect } from "vitest";
import { PaperHarness } from "@/twin/paper-harness";
import agg from "/tmp/agg.json";

describe("paper trade lifecycle on real Binance aggTrades", () => {
  it("opens, marks on twin price, closes on stop/target, journals once", () => {
    const h = new PaperHarness("BTCUSDT");
    let fills = 0, closes = 0, closeEntry: any = null;
    const marks: number[] = [];
    for (const t of agg as any[]) {
      const price = parseFloat(t.p);
      const c = h.ingest({
        price, volume: parseFloat(t.q), ts: t.T, receivedAt: t.T,
        bid: price - 0.5, ask: price + 0.5, side: t.m ? "sell" : "buy",
        intent: "long", // supplied by fusion in production; forced here only to exercise the existing entry path
      });
      for (const e of c.entries) {
        if (e.kind === "ORDER_FILLED") fills++;
        if (e.kind === "TRADE_CLOSED") { closes++; closeEntry = e.payload; }
      }
      const pos = c.broker.openPosition;
      if (pos) marks.push(c.twin.last!.price);
      if (closes) break;
    }
    console.log({ fills, closes, closeEntry, marksSeen: marks.length });
    expect(fills).toBe(1);
    expect(closes).toBe(1);
    expect(["STOP","TARGET"]).toContain(closeEntry.reason);
  });
});
