/**
 * Automatic Trade Journal — Types
 *
 * A structured record of trade lifecycle events. This journal is
 * append-only from the caller's perspective; entries are enriched with
 * derived metrics (R-multiple, hold time) when trades are closed.
 *
 * Distinct from the Psychology Journal — this focuses on the trades
 * themselves rather than emotional state.
 */

export type TradeSide = "long" | "short";
export type TradeStatus = "open" | "closed" | "cancelled";

export interface TradeSetup {
  bias: "bullish" | "bearish";
  reason: string;
  confluences: string[];
  confidence?: number;
}

export interface TradeExecution {
  time: number;
  price: number;
  quantity: number;
  note?: string;
}

export interface TradeEntry {
  id: string;
  symbol: string;
  side: TradeSide;
  status: TradeStatus;
  openedAt: number;
  closedAt?: number;
  entryPrice: number;
  exitPrice?: number;
  stop: number;
  targets: number[];
  quantity: number;
  setup: TradeSetup;
  fills: TradeExecution[];
  tags: string[];
  notes: string[];
  /** Realized R-multiple (exit vs stop). Present when closed. */
  rMultiple?: number;
  /** Realized PnL (currency). Present when closed. */
  pnl?: number;
  holdMinutes?: number;
}

export interface OpenTradeInput {
  id?: string;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  stop: number;
  targets?: number[];
  quantity: number;
  setup: TradeSetup;
  tags?: string[];
  time?: number;
}

export interface CloseTradeInput {
  id: string;
  exitPrice: number;
  time?: number;
  note?: string;
}

export interface JournalQuery {
  symbol?: string;
  status?: TradeStatus;
  side?: TradeSide;
  tag?: string;
  from?: number;
  to?: number;
}

export interface JournalStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgR: number;
  expectancy: number;
  bestR: number;
  worstR: number;
  totalPnl: number;
}
