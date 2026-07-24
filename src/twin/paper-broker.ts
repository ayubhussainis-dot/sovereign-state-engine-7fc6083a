/**
 * Paper Broker — deterministic paper execution over real Binance ticks.
 *
 * Contract:
 *   - No broker calls. No mock data. Uses the real live WS price fed in
 *     from the harness.
 *   - Opens ONE position when SOALL all-gates-passed AND fusion verdict
 *     is directional (LOCKED-BULL → long, LOCKED-BEAR → short).
 *   - Fixed notional, fixed stop/target as fraction of entry.
 *   - On every subsequent tick, marks the position and closes on
 *     stop-hit or target-hit at the crossing price.
 *   - Records realized PnL. Pure state machine — same tick tape yields
 *     identical trade log.
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
  stopFrac: number;       // e.g. 0.0015 = 15 bps
  targetFrac: number;     // e.g. 0.0030 = 30 bps
}

export interface OpenSignal {
  side: Side;
  price: number;
  ts: number;
  twinSeq: number;
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
      stopFrac: 0.0015,
      targetFrac: 0.003,
      ...cfg,
    };
  }

  /** Attempt to open a position. No-op if one is already open. */
  open(signal: OpenSignal): BrokerEvent | null {
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