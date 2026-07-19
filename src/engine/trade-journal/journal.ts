import type {
  CloseTradeInput,
  JournalQuery,
  JournalStats,
  OpenTradeInput,
  TradeEntry,
  TradeExecution,
} from "./types";

/**
 * In-memory automatic trade journal. Deterministic; no side effects
 * beyond internal state. Suitable to be swapped for a persistent
 * backing store behind the same interface.
 */
export class TradeJournal {
  private entries = new Map<string, TradeEntry>();
  private seq = 0;

  open(input: OpenTradeInput): TradeEntry {
    const id = input.id ?? this.nextId();
    const now = input.time ?? Date.now();
    const entry: TradeEntry = {
      id,
      symbol: input.symbol,
      side: input.side,
      status: "open",
      openedAt: now,
      entryPrice: input.entryPrice,
      stop: input.stop,
      targets: input.targets ?? [],
      quantity: input.quantity,
      setup: input.setup,
      fills: [
        {
          time: now,
          price: input.entryPrice,
          quantity: input.quantity,
          note: "entry",
        },
      ],
      tags: input.tags ?? [],
      notes: [],
    };
    this.entries.set(id, entry);
    return entry;
  }

  close(input: CloseTradeInput): TradeEntry {
    const entry = this.entries.get(input.id);
    if (!entry) throw new Error(`Trade ${input.id} not found`);
    if (entry.status !== "open") return entry;

    const time = input.time ?? Date.now();
    const fill: TradeExecution = {
      time,
      price: input.exitPrice,
      quantity: entry.quantity,
      note: input.note ?? "exit",
    };
    entry.fills.push(fill);
    entry.status = "closed";
    entry.closedAt = time;
    entry.exitPrice = input.exitPrice;
    entry.holdMinutes = Math.max(0, Math.round((time - entry.openedAt) / 60000));

    const risk = Math.abs(entry.entryPrice - entry.stop);
    const move =
      entry.side === "long"
        ? input.exitPrice - entry.entryPrice
        : entry.entryPrice - input.exitPrice;
    entry.rMultiple = risk === 0 ? 0 : move / risk;
    entry.pnl = move * entry.quantity;
    return entry;
  }

  cancel(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (entry.status !== "open") return;
    entry.status = "cancelled";
  }

  addNote(id: string, note: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.notes.push(note);
  }

  addTag(id: string, tag: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (!entry.tags.includes(tag)) entry.tags.push(tag);
  }

  get(id: string): TradeEntry | undefined {
    return this.entries.get(id);
  }

  list(query: JournalQuery = {}): TradeEntry[] {
    return [...this.entries.values()].filter((e) => {
      if (query.symbol && e.symbol !== query.symbol) return false;
      if (query.status && e.status !== query.status) return false;
      if (query.side && e.side !== query.side) return false;
      if (query.tag && !e.tags.includes(query.tag)) return false;
      if (query.from && e.openedAt < query.from) return false;
      if (query.to && e.openedAt > query.to) return false;
      return true;
    });
  }

  stats(query: JournalQuery = {}): JournalStats {
    const closed = this.list({ ...query, status: "closed" });
    if (closed.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgR: 0,
        expectancy: 0,
        bestR: 0,
        worstR: 0,
        totalPnl: 0,
      };
    }
    const rs = closed.map((e) => e.rMultiple ?? 0);
    const wins = rs.filter((r) => r > 0).length;
    const losses = rs.filter((r) => r < 0).length;
    const totalPnl = closed.reduce((s, e) => s + (e.pnl ?? 0), 0);
    const avgR = rs.reduce((s, r) => s + r, 0) / rs.length;
    const winRate = wins / closed.length;
    const avgWin = wins ? rs.filter((r) => r > 0).reduce((s, r) => s + r, 0) / wins : 0;
    const avgLoss = losses
      ? rs.filter((r) => r < 0).reduce((s, r) => s + r, 0) / losses
      : 0;
    return {
      totalTrades: closed.length,
      wins,
      losses,
      winRate,
      avgR,
      expectancy: winRate * avgWin + (1 - winRate) * avgLoss,
      bestR: Math.max(...rs),
      worstR: Math.min(...rs),
      totalPnl,
    };
  }

  clear(): void {
    this.entries.clear();
    this.seq = 0;
  }

  private nextId(): string {
    this.seq += 1;
    return `trade_${this.seq}`;
  }
}
