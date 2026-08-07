/**
 * Trade Ledger — permanent, append-only journal of REAL paper trades.
 *
 * Every record originates from an actual PaperBroker close event driven by
 * live Binance tick data. Nothing here is simulated or seeded. Records are
 * persisted to localStorage so the journal survives reloads/restarts.
 */

export interface JournalRecord {
  /** Stable id: symbol + broker trade id + close timestamp. */
  id: string;
  /** Entry timestamp (ms epoch, exchange time). */
  timestamp: number;
  closedAt: number;
  symbol: string;
  /** BUY = long, SELL = short. */
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  /** JOALL conviction, 1..10, derived from the SOALL composite at entry. */
  joallValue: number;
  /** MC01 state summary captured at entry. */
  mc01State: string;
  /** EYE vessel energy (0..100) captured at entry. */
  eyeEnergy: number;
  reasonEntry: string;
  reasonExit: string;
}

export interface JournalStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
}

const STORAGE_KEY = "joall.trade-ledger.v1";

type Listener = (records: readonly JournalRecord[]) => void;

class TradeLedgerStore {
  private records: JournalRecord[] = [];
  private loaded = false;
  private readonly listeners = new Set<Listener>();

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) this.records = parsed as JournalRecord[];
    } catch {
      /* corrupt payload — start clean rather than crash the terminal */
    }
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch {
      /* quota exceeded — keep in-memory copy */
    }
  }

  all(): readonly JournalRecord[] {
    this.load();
    return this.records;
  }

  append(record: JournalRecord): void {
    this.load();
    if (this.records.some((r) => r.id === record.id)) return;
    this.records.push(record);
    this.persist();
    for (const l of this.listeners) l(this.records);
  }

  clear(): void {
    this.load();
    this.records = [];
    this.persist();
    for (const l of this.listeners) l(this.records);
  }

  subscribe(l: Listener): () => void {
    this.load();
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const tradeLedger = new TradeLedgerStore();

export function computeStats(records: readonly JournalRecord[]): JournalStats {
  const totalTrades = records.length;
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      netPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
    };
  }
  const sorted = [...records].sort((a, b) => a.closedAt - b.closedAt);
  const winsArr = sorted.filter((r) => r.pnl > 0);
  const lossArr = sorted.filter((r) => r.pnl < 0);
  const grossWin = winsArr.reduce((s, r) => s + r.pnl, 0);
  const grossLoss = Math.abs(lossArr.reduce((s, r) => s + r.pnl, 0));

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const r of sorted) {
    equity += r.pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    totalTrades,
    wins: winsArr.length,
    losses: lossArr.length,
    winRate: winsArr.length / totalTrades,
    netPnL: sorted.reduce((s, r) => s + r.pnl, 0),
    avgWin: winsArr.length ? grossWin / winsArr.length : 0,
    avgLoss: lossArr.length ? -grossLoss / lossArr.length : 0,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss,
    maxDrawdown,
  };
}

const CSV_HEADERS = [
  "timestamp",
  "closed_at",
  "symbol",
  "direction",
  "entry_price",
  "exit_price",
  "quantity",
  "pnl",
  "joall_value",
  "mc01_state",
  "eye_energy",
  "reason_entry",
  "reason_exit",
];

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(records: readonly JournalRecord[]): string {
  const rows = records.map((r) =>
    [
      new Date(r.timestamp).toISOString(),
      new Date(r.closedAt).toISOString(),
      r.symbol,
      r.direction,
      r.entryPrice,
      r.exitPrice,
      r.quantity,
      r.pnl,
      r.joallValue,
      r.mc01State,
      r.eyeEnergy,
      r.reasonEntry,
      r.reasonExit,
    ]
      .map(csvCell)
      .join(","),
  );
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

export function downloadCSV(records: readonly JournalRecord[]): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([toCSV(records)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `joall-trade-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}