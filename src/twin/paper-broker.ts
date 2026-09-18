export type Side = "long" | "short";

export interface PaperPosition {
  id: number;
  side: Side;
  entry: number;
  stop: number;
  target: number;
  qty: number;
  openedAt: number;
  openedTwinSeq: number;
}

export interface PaperTrade {
  id: number;
  side: Side;
  entry: number;
  exit: number;
  qty: number;
  pnl: number;
  reason: "TARGET" | "STOP";
  openedAt: number;
  closedAt: number;
}

export interface PaperStats {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  cumPnL: number;
  openPosition: PaperPosition | null;
  lastTrade: PaperTrade | null;
}

export interface PaperBrokerConfig {
  notionalUsdt: number;   // capital per trade
  stopFrac: number;       // 0.0015 = 15 bps (tight cut on stalls)
  targetFrac: number;     // 0.0065 = 65 bps (wide runner target for 60-70+ expansions)
}

export interface OpenSignal {
  side: Side;
  price: number;
  ts: number;
  twinSeq: number;
  waveType?: string;   // "EXPANDED", "ANTINODE_PEAK", "NODAL_ZERO", "COMPRESSED"
  composite?: number;  // Optional quality threshold
}

export type BrokerEvent =
  | { kind: "FILL"; position: PaperPosition }
  | { kind: "CLOSE"; trade: PaperTrade };

export class PaperBroker {
  private cfg: PaperBrokerConfig;
  private position: PaperPosition | null = null;
  private trades: PaperTrade[] = [];
  private nextId = 1;
  private cumPnL = 0;
  private wins = 0;
  private losses = 0;

  constructor(cfg?: Partial<PaperBrokerConfig>) {
    this.cfg = {
      notionalUsdt: 100,
      stopFrac: 0.0015,  // Tight 15 bps stop to kill zero-line pullbacks quickly
      targetFrac: 0.0065, // Wide 65 bps runner target to capture structural 60-70+ expansions
      ...cfg,
    };
  }

  /** Attempt to open a position. Restricts entry ONLY to high-win EXPANDED or ANTINODE_PEAK waves. */
  open(signal: OpenSignal): BrokerEvent | null {
    if (this.position) return null;
    if (!Number.isFinite(signal.price) || signal.price <= 0) return null;

    // Strict High-Win Filter: Only permit trade entry on EXPANDED or ANTINODE_PEAK wave states
    const wave = (signal.waveType || "").toUpperCase();
    if (wave !== "EXPANDED" && wave !== "ANTINODE_PEAK") {
      return null;
    }

    const qty = this.cfg.notionalUsdt / signal.price;
    const stop =
      signal.side === "long"
        ? signal.price * (1 - this.cfg.stopFrac)
        : signal.price * (1 + this.cfg.stopFrac);
    const target =
      signal.side === "long"
        ? signal.price * (1 + this.cfg.targetFrac)
        : signal.price * (1 - this.cfg.targetFrac);
    
    const pos: PaperPosition = {
      id: this.nextId++,
      side: signal.side,
      entry: signal.price,
      stop,
      target,
      qty,
      openedAt: signal.ts,
      openedTwinSeq: signal.twinSeq,
    };
    
    this.position = pos;
    return { kind: "FILL", position: pos };
  }

  /** Mark the open position against the latest tick; may close. */
  mark(price: number, ts: number): BrokerEvent | null {
    const pos = this.position;
    if (!pos) return null;
    if (!Number.isFinite(price) || price <= 0) return null;

    let exit: number | null = null;
    let reason: PaperTrade["reason"] | null = null;
    if (pos.side === "long") {
      if (price <= pos.stop) { exit = pos.stop; reason = "STOP"; }
      else if (price >= pos.target) { exit = pos.target; reason = "TARGET"; }
    } else {
      if (price >= pos.stop) { exit = pos.stop; reason = "STOP"; }
      else if (price <= pos.target) { exit = pos.target; reason = "TARGET"; }
    }
    if (exit == null || reason == null) return null;

    const gross =
      pos.side === "long"
        ? (exit - pos.entry) * pos.qty
        : (pos.entry - exit) * pos.qty;
    
    const trade: PaperTrade = {
      id: pos.id,
      side: pos.side,
      entry: pos.entry,
      exit,
      qty: pos.qty,
      pnl: gross,
      reason,
      openedAt: pos.openedAt,
      closedAt: ts,
    };

    this.trades.push(trade);
    this.cumPnL += gross;
    if (gross >= 0) this.wins++; else this.losses++;
    this.position = null;
    return { kind: "CLOSE", trade };
  }

  stats(): PaperStats {
    const t = this.trades.length;
    return {
      trades: t,
      wins: this.wins,
      losses: this.losses,
      winRate: t === 0 ? 0 : this.wins / t,
      cumPnL: this.cumPnL,
      openPosition: this.position,
      lastTrade: t === 0 ? null : this.trades[t - 1],
    };
  }

  recent(n = 20): readonly PaperTrade[] {
    return this.trades.slice(-n);
  }

  reset(): void {
    this.position = null;
    this.trades = [];
    this.cumPnL = 0;
    this.wins = 0;
    this.losses = 0;
    this.nextId = 1;
  }
}
