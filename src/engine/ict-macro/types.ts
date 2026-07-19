/**
 * ICT Macro Engine — Types
 *
 * ICT "macros" are narrow intraday windows during which price is expected
 * to seek liquidity or rebalance. This engine identifies which macro
 * window(s) a given timestamp falls into and returns the OHLC snapshot
 * for each macro across a bar series.
 */

import type { OHLCBar } from "../market-structure/types";

export type ICTMacroId =
  | "london-open"
  | "london-lunch"
  | "am-macro-1"
  | "am-macro-2"
  | "nyse-open"
  | "lunch-macro"
  | "pm-macro-1"
  | "pm-macro-2"
  | "final-hour";

export interface ICTMacroWindow {
  id: ICTMacroId;
  label: string;
  /** Start time in minutes from UTC midnight. */
  startMinute: number;
  endMinute: number;
  purpose: string;
}

export interface ICTMacroSnapshot {
  id: ICTMacroId;
  label: string;
  start: number;
  end: number;
  high: number;
  low: number;
  open: number;
  close: number;
  bars: number;
}

export interface ICTMacroAnalysis {
  snapshots: ICTMacroSnapshot[];
  activeAt?: ICTMacroId[];
}

export interface ICTMacroOptions {
  macros?: ICTMacroId[];
  at?: number;
}

export type { OHLCBar };
