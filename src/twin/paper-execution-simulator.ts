/**
 * Paper Execution Simulator — deterministic paper execution over real Binance ticks.
 *
 * Contract:
 *   - No live exchange calls. No mock data. Uses the real live WS price fed in
 *     from the harness.
 *   - Opens ONE position when SOALL all-gates-passed AND fusion verdict
 *     is directional (LOCKED-BULL → long, LOCKED-BEAR → short).
 *   - Fixed $10 notional.
 *   - Initial stop set to 17.5 bps (0.00175).
 *   - Locks stop to breakeven at +15 bps (0.0015) gain so downside risk becomes zero.
 *   - Closes for a win when target hits +50 bps (0.0050) for a 35 bps net profit from breakeven.
 *   - Only counts strictly positive PnL trades as wins (filters out $0.00 scratches).
 */

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
  breakevenLocked?: boolean;
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

export interface PaperExecutionConfig {
  notionalUsdt: number;
  stopFrac: number;
  targetFrac: number;
}

export interface OpenSignal {
  side: Side;
  price: number;
  ts: number;
  twinSeq: number;
}

export type PaperExecutionEvent =
  | { kind: "FILL"; position: PaperPosition }
  | { kind: "CLOSE"; trade: PaperTrade };

export class PaperExecutionSimulator {
  private cfg: PaperExecutionConfig;
  private position: PaperPosition | null = null;
  private trades: PaperTrade[] = [];
  private nextId = 1;
  private cumPnL = 0;
  private wins = 0;
  private losses = 0;

  constructor(cfg?: Partial<PaperExecutionConfig>) {
    this.cfg = {
      notionalUsdt: 10,
      stopFrac: 0.00175,  // 17.5 bps initial stop
      targetFrac: 0.0050,  // 50 bps total target (giving a 35 bps net win from breakeven)
      ...cfg,
    };
  }

  /** Attempt to open a position. No-op if one is already open. */
  open(signal: OpenSignal): PaperExecutionEvent | null {
    if (this.position) return null;
    if (!Number.isFinite(signal.price) || signal.price <= 0) return null;

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
      breakevenLocked: false,
    };

    this.position = pos;

    return { kind: "FILL", position: pos };
  }

  /** Mark the open position against the latest tick; handles breakeven lock and 50 bps target exits. */
  mark(price: number, ts: number): PaperExecutionEvent | null {
    const pos = this.position;

    if (!pos) return null;
    if (!Number.isFinite(price) || price <= 0) return null;

    // Calculate current unrealized gain fraction from entry
    const currentGainFrac =
      pos.side === "long"
        ? (price - pos.entry) / pos.entry
        : (pos.entry - price) / pos.entry;

    // If profit hits +15 bps (+0.0015) and isn't locked yet, snap stop to entry (breakeven)
    if (!pos.breakevenLocked && currentGainFrac >= 0.0015) {
      pos.breakevenLocked = true;
      pos.stop = pos.entry;
    }

    let exit: number | null = null;
    let reason: PaperTrade["reason"] | null = null;

    if (pos.side === "long") {
      if (price <= pos.stop) {
        exit = pos.stop;
        reason = "STOP";
      } else if (price >= pos.target) {
        exit = pos.target;
        reason = "TARGET";
      }
    } else {
      if (price >= pos.stop) {
        exit = pos.stop;
        reason = "STOP";
      } else if (price <= pos.target) {
        exit = pos.target;
        reason = "TARGET";
      }
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

    // Fixed win/loss logic: only actual positive profit counts as a win.
    if (gross > 0) {
      this.wins++;
    } else if (gross < 0) {
      this.losses++;
    }

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
