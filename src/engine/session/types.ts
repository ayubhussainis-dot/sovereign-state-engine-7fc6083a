/**
 * Session Engine — Types
 *
 * Global trading sessions and ICT-flavoured killzones. Deterministic,
 * timezone-aware windowing over UTC millisecond timestamps.
 */

import type { OHLCBar } from "../market-structure/types";

export type SessionId =
  | "asia"
  | "london"
  | "new-york-am"
  | "new-york-pm"
  | "london-killzone"
  | "new-york-killzone"
  | "asia-killzone"
  | "london-close";

export interface SessionWindow {
  id: SessionId;
  label: string;
  /** UTC hour range [startHour, endHour) — endHour may wrap past 24. */
  startHour: number;
  endHour: number;
  killzone?: boolean;
}

export interface SessionRange {
  id: SessionId;
  label: string;
  start: number;
  end: number;
  high: number;
  low: number;
  open: number;
  close: number;
  bars: number;
}

export interface SessionAnalysis {
  ranges: SessionRange[];
  activeAt?: SessionId[];
}

export interface SessionOptions {
  /** Restrict analysis to a subset of sessions. */
  sessions?: SessionId[];
  /** Observation timestamp for `activeAt`. Defaults to last bar time. */
  at?: number;
}

export type { OHLCBar };
