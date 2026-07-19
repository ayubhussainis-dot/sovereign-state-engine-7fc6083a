import { computeDrawdown } from "../risk/calculator";
import type {
  BacktestConfig,
  BacktestContext,
  BacktestFill,
  BacktestOrder,
  BacktestPosition,
  BacktestReport,
  BacktestTrade,
} from "./types";

/**
 * Run an event-driven backtest. One symbol, one open position at a time.
 * Orders submitted on bar[i] are filled at the start of bar[i+1] using
 * bar[i+1].open as the reference price. Limit/stop orders fill only if
 * bar[i+1] traded through the level.
 */
export function runBacktest(config: BacktestConfig): BacktestReport {
  const commPerShare = config.commissionPerShare ?? 0;
  const commPerTrade = config.commissionPerTrade ?? 0;
  const slippage = config.slippage ?? 0;

  const fills: BacktestFill[] = [];
  const trades: BacktestTrade[] = [];
  const equityCurve: BacktestReport["equityCurve"] = [];

  let cash = config.initialCash;
  let position: BacktestPosition | undefined;
  let pendingOrders: BacktestOrder[] = [];

  const markToMarket = (price: number) =>
    cash + (position ? position.qty * price * (position.side === "long" ? 1 : -1) + (position.side === "short" ? position.qty * position.avgPrice * 2 : 0) : 0);
  // Simpler: equity = cash + unrealized pnl
  const equityAt = (price: number) => {
    if (!position) return cash;
    const pnl =
      position.side === "long"
        ? (price - position.avgPrice) * position.qty
        : (position.avgPrice - price) * position.qty;
    return cash + position.qty * position.avgPrice + pnl - (position.side === "short" ? position.qty * position.avgPrice : 0);
  };
  // Even simpler and correct book-keeping: track "realized cash" only, and
  // compute equity as cash + unrealized position pnl. Cash decreases on
  // long entry, increases on long exit, and mirrors for shorts.
  void markToMarket; // silence unused

  const executeMarket = (order: BacktestOrder, bar: (typeof config.bars)[number]) => {
    const raw = bar.open;
    const price =
      order.side === "long" ? raw * (1 + slippage) : raw * (1 - slippage);
    fillOrder(order, price, bar.time);
  };

  const executeLimit = (order: BacktestOrder, bar: (typeof config.bars)[number]) => {
    if (order.limit === undefined) return;
    const hit =
      order.side === "long"
        ? bar.low <= order.limit
        : bar.high >= order.limit;
    if (!hit) return;
    const price = order.limit;
    fillOrder(order, price, bar.time);
  };

  const executeStop = (order: BacktestOrder, bar: (typeof config.bars)[number]) => {
    if (order.stop === undefined) return;
    const hit =
      order.side === "long"
        ? bar.high >= order.stop
        : bar.low <= order.stop;
    if (!hit) return;
    const price = order.stop;
    fillOrder(order, price, bar.time);
  };

  function fillOrder(order: BacktestOrder, price: number, time: number) {
    const fee = order.qty * commPerShare + commPerTrade;
    const cost = order.qty * price;

    if (!position) {
      if (order.side === "long") cash -= cost + fee;
      else cash += cost - fee; // short proceeds credited
      position = {
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        avgPrice: price,
        openedAt: time,
      };
    } else if (position.side !== order.side) {
      const closeQty = Math.min(order.qty, position.qty);
      const pnl =
        position.side === "long"
          ? (price - position.avgPrice) * closeQty
          : (position.avgPrice - price) * closeQty;
      if (position.side === "long") cash += closeQty * price - fee;
      else cash -= closeQty * price + fee;

      trades.push({
        symbol: position.symbol,
        side: position.side,
        qty: closeQty,
        entryTime: position.openedAt,
        entryPrice: position.avgPrice,
        exitTime: time,
        exitPrice: price,
        pnl,
        reason: order.reason,
      });

      const remaining = position.qty - closeQty;
      if (remaining <= 0) position = undefined;
      else position = { ...position, qty: remaining };
    } else {
      // Add to existing position — weighted average
      const totalQty = position.qty + order.qty;
      const newAvg = (position.avgPrice * position.qty + price * order.qty) / totalQty;
      if (position.side === "long") cash -= cost + fee;
      else cash += cost - fee;
      position = { ...position, qty: totalQty, avgPrice: newAvg };
    }

    fills.push({
      time,
      symbol: order.symbol,
      side: order.side,
      qty: order.qty,
      price,
      fee,
      reason: order.reason,
    });
  }

  const bars = config.bars;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    // Execute previously queued orders on this bar
    for (const order of pendingOrders) {
      if (order.type === "market") executeMarket(order, bar);
      else if (order.type === "limit") executeLimit(order, bar);
      else if (order.type === "stop") executeStop(order, bar);
    }
    pendingOrders = [];

    const ctx: BacktestContext = {
      time: bar.time,
      index: i,
      bar,
      bars,
      position,
      cash,
      equity: equityAt(bar.close),
      submit: (order) => pendingOrders.push(order),
      close: (reason) => {
        if (!position) return;
        pendingOrders.push({
          symbol: position.symbol,
          side: position.side === "long" ? "short" : "long",
          type: "market",
          qty: position.qty,
          reason,
        });
      },
    };

    config.strategy(ctx);

    equityCurve.push({ time: bar.time, equity: equityAt(bar.close) });
  }

  // Force-close any open position at the last close for reporting
  const lastBar = bars[bars.length - 1];
  if (position && lastBar) {
    const price = lastBar.close;
    const pnl =
      position.side === "long"
        ? (price - position.avgPrice) * position.qty
        : (position.avgPrice - price) * position.qty;
    if (position.side === "long") cash += position.qty * price;
    else cash -= position.qty * price;
    trades.push({
      symbol: position.symbol,
      side: position.side,
      qty: position.qty,
      entryTime: position.openedAt,
      entryPrice: position.avgPrice,
      exitTime: lastBar.time,
      exitPrice: price,
      pnl,
      reason: "mark-to-close",
    });
    position = undefined;
    equityCurve[equityCurve.length - 1] = { time: lastBar.time, equity: cash };
  }

  const finalEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].equity : cash;
  const totalReturn = config.initialCash > 0 ? (finalEquity - config.initialCash) / config.initialCash : 0;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const avgTrade = trades.length > 0 ? trades.reduce((s, t) => s + t.pnl, 0) / trades.length : 0;
  const bestTrade = trades.reduce((m, t) => Math.max(m, t.pnl), 0);
  const worstTrade = trades.reduce((m, t) => Math.min(m, t.pnl), 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const dd = computeDrawdown(equityCurve);

  // Sharpe from per-bar equity returns (unannualized).
  const rets: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    const cur = equityCurve[i].equity;
    if (prev !== 0) rets.push((cur - prev) / prev);
  }
  const mean = rets.length ? rets.reduce((s, r) => s + r, 0) / rets.length : 0;
  const variance = rets.length
    ? rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length
    : 0;
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;

  return {
    symbol: config.symbol,
    bars: bars.length,
    fills,
    trades,
    equityCurve,
    finalEquity,
    totalReturn,
    winRate,
    avgTrade,
    bestTrade,
    worstTrade,
    maxDrawdown: dd.maxDrawdown,
    maxDrawdownFraction: dd.maxDrawdownFraction,
    profitFactor,
    sharpe,
  };
}
