/**
 * Paper Execution Simulator — deterministic paper execution over real Binance ticks.
 *
 * Contract:
 *   - No live exchange calls.
 *   - No mock market data.
 *   - Uses the real live WS price supplied by the harness.
 *   - The harness decides whether execution is authorized.
 *   - One position at a time.
 *   - Fixed $10 notional by default.
 *   - 20 bps initial stop.
 *   - 40 bps target.
 *   - No breakeven or trailing logic.
 *   - Strictly positive PnL = win.
 *
 * Execution authority remains upstream:
 *
 *   G1 = synchronization safety
 *   G2..G6 = quality
 *   G7 = risk authority
 *   G8 = final authority
 *   Fusion = direction
 *
 * This module executes; it does not decide.
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
  | {
      kind: "FILL";
      position: PaperPosition;
    }
  | {
      kind: "CLOSE";
      trade: PaperTrade;
    };

const DEFAULT_CONFIG: PaperExecutionConfig = {
  notionalUsdt: 10,
  stopFrac: 0.0020,
  targetFrac: 0.0040,
};

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validateConfig(
  cfg: PaperExecutionConfig,
): PaperExecutionConfig {
  if (!isPositiveFinite(cfg.notionalUsdt)) {
    throw new Error(
      "PaperExecutionSimulator: notionalUsdt must be > 0",
    );
  }

  if (
    !Number.isFinite(cfg.stopFrac) ||
    cfg.stopFrac <= 0
  ) {
    throw new Error(
      "PaperExecutionSimulator: stopFrac must be > 0",
    );
  }

  if (
    !Number.isFinite(cfg.targetFrac) ||
    cfg.targetFrac <= 0
  ) {
    throw new Error(
      "PaperExecutionSimulator: targetFrac must be > 0",
    );
  }

  return cfg;
}

export class PaperExecutionSimulator {
  private readonly cfg: PaperExecutionConfig;

  private position: PaperPosition | null = null;

  private trades: PaperTrade[] = [];

  private nextId = 1;

  private cumPnL = 0;

  private wins = 0;

  private losses = 0;

  constructor(
    cfg?: Partial<PaperExecutionConfig>,
  ) {
    this.cfg = validateConfig({
      ...DEFAULT_CONFIG,
      ...cfg,
    });
  }

  /**
   * Attempt to open one paper position.
   *
   * No-op when a position is already open.
   * Direction has already been authorized upstream.
   */
  open(
    signal: OpenSignal,
  ): PaperExecutionEvent | null {
    if (this.position) {
      return null;
    }

    if (!isPositiveFinite(signal.price)) {
      return null;
    }

    if (
      !Number.isFinite(signal.ts) ||
      signal.ts <= 0
    ) {
      return null;
    }

    if (
      !Number.isFinite(signal.twinSeq) ||
      signal.twinSeq < 0
    ) {
      return null;
    }

    const qty =
      this.cfg.notionalUsdt /
      signal.price;

    if (!isPositiveFinite(qty)) {
      return null;
    }

    const stop =
      signal.side === "long"
        ? signal.price *
          (1 - this.cfg.stopFrac)
        : signal.price *
          (1 + this.cfg.stopFrac);

    const target =
      signal.side === "long"
        ? signal.price *
          (1 + this.cfg.targetFrac)
        : signal.price *
          (1 - this.cfg.targetFrac);

    if (
      !isPositiveFinite(stop) ||
      !isPositiveFinite(target)
    ) {
      return null;
    }

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

  /**
   * Mark the current position against the latest live tick.
   *
   * Long:
   *   price <= stop   -> STOP
   *   price >= target -> TARGET
   *
   * Short:
   *   price >= stop   -> STOP
   *   price <= target -> TARGET
   */
  mark(
    price: number,
    ts: number,
  ): PaperExecutionEvent | null {
    const pos = this.position;

    if (!pos) {
      return null;
    }

    if (!isPositiveFinite(price)) {
      return null;
    }

    if (
      !Number.isFinite(ts) ||
      ts <= 0
    ) {
      return null;
    }

    let exit: number | null = null;

    let reason: PaperTrade["reason"] | null =
      null;

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

    if (
      exit === null ||
      reason === null
    ) {
      return null;
    }

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
    const trades =
      this.trades.length;

    return {
      trades,
      wins: this.wins,
      losses: this.losses,
      winRate:
        trades === 0
          ? 0
          : this.wins / trades,
      cumPnL: this.cumPnL,
      openPosition: this.position,
      lastTrade:
        trades === 0
          ? null
          : this.trades[trades - 1],
    };
  }

  recent(
    n = 20,
  ): readonly PaperTrade[] {
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
