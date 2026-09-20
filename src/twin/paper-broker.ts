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
  notionalUsdt: number;
  stopFrac: number;
  targetFrac: number;
}

export interface OpenSignal {
  side: Side;
  price: number;
  ts: number;
  twinSeq: number;

  // Retained for compatibility with existing callers.
  // Entry authority belongs to SOALL/Fusion/Risk Authority.
  waveType?: string;
  composite?: number;
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
      notionalUsdt: 10,
      stopFrac: 0.0020,
      targetFrac: 0.0040,
      ...cfg,
    };
  }

  open(signal: OpenSignal): BrokerEvent | null {
    if (this.position) return null;

    if (!Number.isFinite(signal.price) || signal.price <= 0) {
      return null;
    }

    if (!Number.isFinite(signal.ts) || signal.ts <= 0) {
      return null;
    }

    if (!Number.isFinite(signal.twinSeq) || signal.twinSeq < 0) {
      return null;
    }

    const qty = this.cfg.notionalUsdt / signal.price;

    if (!Number.isFinite(qty) || qty <= 0) {
      return null;
    }

    const stop =
      signal.side === "long"
        ? signal.price * (1 - this.cfg.stopFrac)
        : signal.price * (1 + this.cfg.stopFrac);

    const target =
      signal.side === "long"
        ? signal.price * (1 + this.cfg.targetFrac)
        : signal.price * (1 - this.cfg.targetFrac);

    const position: PaperPosition = {
      id: this.nextId++,
      side: signal.side,
      entry: signal.price,
      stop,
      target,
      qty,
      openedAt: signal.ts,
      openedTwinSeq: signal.twinSeq,
    };

    this.position = position;

    return {
      kind: "FILL",
      position,
    };
  }

  mark(price: number, ts: number): BrokerEvent | null {
    const position = this.position;

    if (!position) {
      return null;
    }

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    if (!Number.isFinite(ts) || ts <= 0) {
      return null;
    }

    let exit: number | null = null;
    let reason: PaperTrade["reason"] | null = null;

    if (position.side === "long") {
      if (price <= position.stop) {
        exit = position.stop;
        reason = "STOP";
      } else if (price >= position.target) {
        exit = position.target;
        reason = "TARGET";
      }
    } else {
      if (price >= position.stop) {
        exit = position.stop;
        reason = "STOP";
      } else if (price <= position.target) {
        exit = position.target;
        reason = "TARGET";
      }
    }

    if (exit === null || reason === null) {
      return null;
    }

    const gross =
      position.side === "long"
        ? (exit - position.entry) * position.qty
        : (position.entry - exit) * position.qty;

    const trade: PaperTrade = {
      id: position.id,
      side: position.side,
      entry: position.entry,
      exit,
      qty: position.qty,
      pnl: gross,
      reason,
      openedAt: position.openedAt,
      closedAt: ts,
    };

    this.trades.push(trade);
    this.cumPnL += gross;

    if (gross > 0) {
      this.wins++;
    } else if (gross < 0) {
      this.losses++;
    }

    this.position = null;

    return {
      kind: "CLOSE",
      trade,
    };
  }

  stats(): PaperStats {
    const trades = this.trades.length;

    return {
      trades,
      wins: this.wins,
      losses: this.losses,
      winRate: trades === 0 ? 0 : this.wins / trades,
      cumPnL: this.cumPnL,
      openPosition: this.position,
      lastTrade: trades === 0 ? null : this.trades[trades - 1],
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
