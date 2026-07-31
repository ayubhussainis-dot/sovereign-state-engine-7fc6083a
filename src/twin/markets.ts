/**
 * Supported markets registry.
 *
 * Add a pair here and the whole platform — feed, twin, PPG, SOALL,
 * broker, dashboard — picks it up. No core engine change required.
 */

import { MarketEngine } from "./market-engine";

export interface MarketDef {
  symbol: string;
  base: string;
}

export const MARKETS: readonly MarketDef[] = [
  { symbol: "BTCUSDT", base: "BTC" },
  { symbol: "ETHUSDT", base: "ETH" },
  { symbol: "SOLUSDT", base: "SOL" },
  { symbol: "BNBUSDT", base: "BNB" },
  { symbol: "XRPUSDT", base: "XRP" },
] as const;

const engines = new Map<string, MarketEngine>();

export function getEngine(symbol: string): MarketEngine {
  let e = engines.get(symbol);
  if (!e) {
    const def = MARKETS.find((m) => m.symbol === symbol);
    e = new MarketEngine(symbol, def?.base ?? symbol.replace("USDT", ""));
    engines.set(symbol, e);
  }
  return e;
}

export function allEngines(): MarketEngine[] {
  return MARKETS.map((m) => getEngine(m.symbol));
}
