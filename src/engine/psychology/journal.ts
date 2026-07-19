import type {
  BiasFlag,
  DisciplineStats,
  JournalEntry,
  PsychologyOptions,
} from "./types";

/**
 * PsychologyJournal — in-memory store of trade journal entries with
 * rule-based bias detection. Persistence is the caller's responsibility.
 */
export class PsychologyJournal {
  private entries: JournalEntry[] = [];
  private opts: Required<PsychologyOptions>;

  constructor(options: PsychologyOptions = {}) {
    this.opts = {
      revengeThreshold: options.revengeThreshold ?? 3,
      overtradingCount: options.overtradingCount ?? 5,
      overtradingWindowMs: options.overtradingWindowMs ?? 60 * 60 * 1000,
    };
  }

  record(entry: JournalEntry): BiasFlag[] {
    this.entries.push(entry);
    this.entries.sort((a, b) => a.at - b.at);
    return this.evaluate(entry);
  }

  list(): readonly JournalEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
  }

  stats(): DisciplineStats {
    const total = this.entries.length;
    const planned = this.entries.filter((e) => e.planned).length;
    const wins = this.entries.filter((e) => (e.pnl ?? 0) > 0).length;
    const rs = this.entries.map((e) => e.rMultiple ?? 0);
    const bestR = rs.length ? Math.max(...rs) : 0;
    const worstR = rs.length ? Math.min(...rs) : 0;
    const avgR = rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : 0;
    const adherence =
      total > 0
        ? this.entries.filter((e) => e.followedPlan).length / total
        : 0;

    let cur = 0;
    let maxLosses = 0;
    for (const e of this.entries) {
      if ((e.pnl ?? 0) < 0) {
        cur += 1;
        if (cur > maxLosses) maxLosses = cur;
      } else if ((e.pnl ?? 0) > 0) {
        cur = 0;
      }
    }

    return {
      totalTrades: total,
      planned,
      planAdherenceRate: adherence,
      winRate: total > 0 ? wins / total : 0,
      avgR,
      bestR,
      worstR,
      consecutiveLosses: cur,
      maxConsecutiveLosses: maxLosses,
    };
  }

  private evaluate(entry: JournalEntry): BiasFlag[] {
    const flags: BiasFlag[] = [];

    // Revenge trading: N consecutive losses ending at this entry.
    const lastN = this.entries.slice(-this.opts.revengeThreshold);
    if (
      lastN.length === this.opts.revengeThreshold &&
      lastN.every((e) => (e.pnl ?? 0) < 0)
    ) {
      flags.push({
        id: "revenge-trading",
        at: entry.at,
        entryId: entry.id,
        severity: "critical",
        message: `${this.opts.revengeThreshold} consecutive losing trades — pause and reset.`,
        evidence: { streak: this.opts.revengeThreshold },
      });
    }

    // Overtrading: count entries in trailing window.
    const windowStart = entry.at - this.opts.overtradingWindowMs;
    const recent = this.entries.filter((e) => e.at >= windowStart);
    if (recent.length >= this.opts.overtradingCount) {
      flags.push({
        id: "overtrading",
        at: entry.at,
        entryId: entry.id,
        severity: "warning",
        message: `${recent.length} trades in the last ${Math.round(this.opts.overtradingWindowMs / 60000)}m — likely overtrading.`,
        evidence: { count: recent.length },
      });
    }

    // Plan deviation → FOMO / hesitation heuristics
    if (!entry.followedPlan && entry.planned) {
      flags.push({
        id: "hesitation",
        at: entry.at,
        entryId: entry.id,
        severity: "warning",
        message: "Deviated from a pre-planned trade.",
      });
    }
    if (!entry.planned) {
      flags.push({
        id: "fomo",
        at: entry.at,
        entryId: entry.id,
        severity: "info",
        message: "Trade taken without a written plan.",
      });
    }

    // Emotion-based bias hints
    if (entry.emotions.includes("revenge")) {
      flags.push({
        id: "revenge-trading",
        at: entry.at,
        entryId: entry.id,
        severity: "warning",
        message: "Self-reported revenge emotion.",
      });
    }
    if (entry.emotions.includes("euphoric") || entry.emotions.includes("greedy")) {
      flags.push({
        id: "overconfidence",
        at: entry.at,
        entryId: entry.id,
        severity: "info",
        message: "Elevated emotional state — reduce size.",
      });
    }

    return flags;
  }
}
