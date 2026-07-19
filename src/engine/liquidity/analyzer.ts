import { detectPivots } from "../market-structure/pivots";
import type { OHLCBar, SwingPoint } from "../market-structure/types";
import type {
  LiquidityAnalysis,
  LiquidityEvent,
  LiquidityOptions,
  LiquidityPool,
} from "./types";

/**
 * Build liquidity pools from pivots and detect sweeps / stop-hunts.
 *
 *  - Highs → buy-side liquidity (BSL); lows → sell-side liquidity (SSL).
 *  - Pivots within `equalTolerance` are merged into a single pool and
 *    marked `equal: true`.
 *  - A bar that trades beyond a pool's level and closes back inside is
 *    a sweep. If the next `reversalWindow` bars produce a counter-move
 *    of at least `reversalThreshold`, it upgrades to a stop-hunt.
 */
export function analyzeLiquidity(
  bars: readonly OHLCBar[],
  options: LiquidityOptions = {},
): LiquidityAnalysis {
  const lookback = options.lookback ?? 2;
  const tol = options.equalTolerance ?? 0.0005;
  const window = options.reversalWindow ?? 3;
  const revThreshold = options.reversalThreshold ?? 0.001;

  const pivots = detectPivots(bars, lookback);
  const pools = buildPools(pivots, tol);

  const events: LiquidityEvent[] = [];

  // Iterate bars; when a pool becomes eligible (bar index > pivot confirm
  // index) check for sweep.
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    for (const pool of pools) {
      if (pool.taken) continue;
      // Pool is only actionable after its most recent forming pivot's
      // right-side confirmation window has closed.
      const readyAt = Math.max(...pool.pivots.map((p) => p.index + lookback));
      if (i <= readyAt) continue;

      const swept =
        pool.side === "buy"
          ? bar.high > pool.price && bar.close < pool.price
          : bar.low < pool.price && bar.close > pool.price;
      if (!swept) continue;

      pool.taken = true;
      pool.takenAt = bar.time;
      pool.takenIndex = i;

      const sweep: LiquidityEvent = {
        kind: "sweep",
        side: pool.side,
        index: i,
        time: bar.time,
        level: pool.price,
        pool,
      };

      // Look forward for reversal.
      const reversal = measureReversal(
        bars,
        i,
        pool.side,
        pool.price,
        window,
      );
      if (reversal >= revThreshold) {
        events.push({ ...sweep, kind: "stop-hunt", reversalStrength: reversal });
      } else {
        events.push(sweep);
      }
    }
  }

  return { bars: bars.length, pools, events };
}

function buildPools(pivots: readonly SwingPoint[], tol: number): LiquidityPool[] {
  const highs = pivots.filter((p) => p.kind === "high");
  const lows = pivots.filter((p) => p.kind === "low");
  return [
    ...cluster(highs, "buy", tol),
    ...cluster(lows, "sell", tol),
  ];
}

function cluster(
  pivots: readonly SwingPoint[],
  side: "buy" | "sell",
  tol: number,
): LiquidityPool[] {
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const groups: SwingPoint[][] = [];
  for (const p of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(p.price - last[0].price) / last[0].price <= tol) {
      last.push(p);
    } else {
      groups.push([p]);
    }
  }
  return groups.map((g) => {
    const price = g.reduce((s, p) => s + p.price, 0) / g.length;
    const createdAt = Math.min(...g.map((p) => p.time));
    return {
      side,
      price,
      pivots: g,
      equal: g.length >= 2,
      createdAt,
    } satisfies LiquidityPool;
  });
}

function measureReversal(
  bars: readonly OHLCBar[],
  from: number,
  side: "buy" | "sell",
  level: number,
  window: number,
): number {
  const end = Math.min(bars.length - 1, from + window);
  let best = 0;
  for (let i = from + 1; i <= end; i++) {
    const move =
      side === "buy"
        ? (level - bars[i].low) / level
        : (bars[i].high - level) / level;
    if (move > best) best = move;
  }
  return best;
}
