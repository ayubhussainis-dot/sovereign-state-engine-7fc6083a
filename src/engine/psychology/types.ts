/**
 * Trading Psychology — Types
 *
 * Structured journal + behavioral bias tracking. No UI; consumers own
 * persistence. Detection is rule-based and transparent.
 */

export type Emotion =
  | "calm"
  | "confident"
  | "anxious"
  | "fearful"
  | "greedy"
  | "frustrated"
  | "revenge"
  | "euphoric"
  | "bored";

export type BiasId =
  | "revenge-trading"
  | "overtrading"
  | "fomo"
  | "loss-aversion"
  | "confirmation-bias"
  | "anchoring"
  | "recency-bias"
  | "overconfidence"
  | "hesitation";

export interface JournalEntry {
  id: string;
  at: number;
  symbol?: string;
  side?: "long" | "short";
  planned: boolean;
  followedPlan: boolean;
  pnl?: number;
  rMultiple?: number;
  emotions: Emotion[];
  notes?: string;
  /** Free-form tags: "breakout", "news", etc. */
  tags?: string[];
}

export interface BiasFlag {
  id: BiasId;
  at: number;
  entryId?: string;
  severity: "info" | "warning" | "critical";
  message: string;
  evidence?: Record<string, unknown>;
}

export interface DisciplineStats {
  totalTrades: number;
  planned: number;
  planAdherenceRate: number;
  winRate: number;
  avgR: number;
  bestR: number;
  worstR: number;
  consecutiveLosses: number;
  maxConsecutiveLosses: number;
}

export interface PsychologyOptions {
  /** Consecutive losses that trigger revenge-trading watch. Defaults 3. */
  revengeThreshold?: number;
  /** Trades in a rolling window that count as overtrading. Defaults 5 per 60 min. */
  overtradingCount?: number;
  overtradingWindowMs?: number;
}
