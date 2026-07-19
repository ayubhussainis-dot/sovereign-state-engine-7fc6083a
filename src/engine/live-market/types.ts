/**
 * Live Market Integration — Types
 *
 * Provider-agnostic surface for live market data and order flow. No
 * provider is connected in this phase; the engine boots into a
 * "disconnected" state and reports true system status.
 *
 * Rules:
 *  - Never emit fabricated ticks or quotes.
 *  - If no provider is registered, all live methods reject with an
 *    explicit "no provider" error and health reports "disconnected".
 */

import type { OHLCBar } from "../market-structure/types";

export type LiveConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "degraded"
  | "error";

export type MarketSession =
  | "pre-market"
  | "regular"
  | "after-hours"
  | "closed";

export interface LiveQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  time: number;
  session?: MarketSession;
}

export interface LiveBar extends OHLCBar {
  symbol: string;
  timeframe: string;
}

export type Unsubscribe = () => void;

export interface LiveMarketProvider {
  readonly id: string;
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  status(): LiveConnectionStatus;
  subscribeQuotes(
    symbols: readonly string[],
    handler: (quote: LiveQuote) => void,
  ): Unsubscribe;
  subscribeBars(
    symbols: readonly string[],
    timeframe: string,
    handler: (bar: LiveBar) => void,
  ): Unsubscribe;
  getSession(): MarketSession;
}

export interface LiveMarketHealth {
  provider?: string;
  status: LiveConnectionStatus;
  session: MarketSession | "unknown";
  subscriptions: number;
  lastError?: string;
}
