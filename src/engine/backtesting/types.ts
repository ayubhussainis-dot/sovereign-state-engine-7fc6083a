/**
 * Backtesting Engine — Types
 *
 * Event-driven, bar-by-bar simulator. Deterministic; no live data.
 * Strategies emit intents; the simulator handles fills, fees, slippage,
 * and equity/drawdown accounting.
 */

import type { OHLCBar } from "../market-structure/types";

export type BacktestSide = "long" | "short";

export interface BacktestOrder {
  symbol: string;
  side: BacktestSide;
  type: "market" | "limit" | "stop";
  qty: number;
  limit?: number;
  stop?: number;
  reason?: string;
}

export interface BacktestFill {
  time: number;
  symbol: string;
  side: BacktestSide;
  qty: number;
  price: number;
  fee: number;
  reason?: string;
}

export interface BacktestPosition {
  symbol: string;
  side: BacktestSide;
  qty: number;
  avgPrice: number;
  openedAt: number;
}

export interface BacktestContext {
  time: number;
  index: number;
  bar: OHLCBar;
  bars: readonly OHLCBar[];
  position?: BacktestPosition;
  cash: number;
  equity: number;
  submit: (order: BacktestOrder) => void;
  close: (reason?: string) => void;
}

export type BacktestStrategy = (ctx: BacktestContext) => void;

export interface BacktestConfig {
  symbol: string;
  bars: readonly OHLCBar[];
  strategy: BacktestStrategy;
  initialCash: number;
  /** Per-share commission. Defaults 0. */
  commissionPerShare?: number;
  /** Fixed commission per fill. Defaults 0. */
  commissionPerTrade?: number;
  /** Fractional slippage per fill (of price). Defaults 0. */
  slippage?: number;
}

export interface BacktestTrade {
  symbol: string;
  side: BacktestSide;
  qty: number;
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  pnl: number;
  rMultiple?: number;
  reason?: string;
}

export interface BacktestReport {
  symbol: string;
  bars: number;
  fills: BacktestFill[];
  trades: BacktestTrade[];
  equityCurve: Array<{ time: number; equity: number }>;
  finalEquity: number;
  totalReturn: number;
  winRate: number;
  avgTrade: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
  maxDrawdownFraction: number;
  profitFactor: number;
  sharpe: number;
}
