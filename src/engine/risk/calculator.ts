import type {
  DrawdownStats,
  EquityPoint,
  OpenExposure,
  PortfolioRisk,
  RMultipleInput,
  SizingInput,
  SizingResult,
  VolTargetInput,
} from "./types";

/**
 * Position size that risks `riskPerTrade` fraction of equity from entry
 * to stop. Enforces per-trade and portfolio caps and notional cap.
 */
export function calculatePositionSize(input: SizingInput): SizingResult {
  const { account, side, entry, stop } = input;
  const riskPerTrade = input.riskPerTrade ?? 0.01;
  const maxNotionalFraction = input.maxNotionalFraction ?? 1;

  const perShareRisk =
    side === "long" ? entry - stop : stop - entry;
  if (perShareRisk <= 0) {
    return {
      shares: 0,
      notional: 0,
      riskAmount: 0,
      riskPerShare: 0,
      capped: true,
      reason: "stop is on the wrong side of entry",
    };
  }

  const cap = Math.min(
    account.maxPositionRisk ?? 1,
    riskPerTrade,
  );
  const riskAmount = account.equity * cap;

  let shares = Math.floor(riskAmount / perShareRisk);
  const maxNotional = account.equity * maxNotionalFraction;
  let notional = shares * entry;
  let capped = cap < riskPerTrade;
  let reason = capped ? "position-risk cap" : undefined;

  if (notional > maxNotional) {
    shares = Math.floor(maxNotional / entry);
    notional = shares * entry;
    capped = true;
    reason = "notional cap";
  }

  return {
    shares,
    notional,
    riskAmount: shares * perShareRisk,
    riskPerShare: perShareRisk,
    capped,
    reason,
  };
}

export function rMultiple(input: RMultipleInput): number {
  const risk = input.side === "long" ? input.entry - input.stop : input.stop - input.entry;
  if (risk <= 0) return 0;
  const pnl = input.side === "long" ? input.exit - input.entry : input.entry - input.exit;
  return pnl / risk;
}

export function assessPortfolioRisk(
  account: { equity: number; maxPortfolioRisk?: number },
  positions: readonly OpenExposure[],
): PortfolioRisk {
  const perPosition = positions.map((p) => {
    const perShare = p.side === "long" ? p.entry - p.stop : p.stop - p.entry;
    const risk = Math.max(0, perShare) * p.shares;
    return {
      symbol: p.symbol,
      risk,
      fraction: account.equity > 0 ? risk / account.equity : 0,
    };
  });
  const totalRisk = perPosition.reduce((s, p) => s + p.risk, 0);
  const totalRiskFraction = account.equity > 0 ? totalRisk / account.equity : 0;
  const breach =
    account.maxPortfolioRisk !== undefined && totalRiskFraction > account.maxPortfolioRisk
      ? `portfolio risk ${(totalRiskFraction * 100).toFixed(2)}% exceeds cap ${(account.maxPortfolioRisk * 100).toFixed(2)}%`
      : undefined;
  return { totalRisk, totalRiskFraction, perPosition, breach };
}

export function computeDrawdown(curve: readonly EquityPoint[]): DrawdownStats {
  if (curve.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownFraction: 0,
      peak: 0,
      trough: 0,
      currentDrawdown: 0,
      currentDrawdownFraction: 0,
    };
  }
  let peak = curve[0].equity;
  let peakAt = curve[0].time;
  let maxDD = 0;
  let maxDDPeak = peak;
  let maxDDTrough = peak;
  let maxDDPeakAt: number | undefined;
  let maxDDTroughAt: number | undefined;

  for (const point of curve) {
    if (point.equity > peak) {
      peak = point.equity;
      peakAt = point.time;
    }
    const dd = peak - point.equity;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPeak = peak;
      maxDDTrough = point.equity;
      maxDDPeakAt = peakAt;
      maxDDTroughAt = point.time;
    }
  }

  const last = curve[curve.length - 1];
  const currentDD = peak - last.equity;
  return {
    maxDrawdown: maxDD,
    maxDrawdownFraction: maxDDPeak > 0 ? maxDD / maxDDPeak : 0,
    peak: maxDDPeak,
    trough: maxDDTrough,
    peakAt: maxDDPeakAt,
    troughAt: maxDDTroughAt,
    currentDrawdown: currentDD,
    currentDrawdownFraction: peak > 0 ? currentDD / peak : 0,
  };
}

/**
 * Volatility-targeted position size. Chooses share count so the position's
 * annualized vol contribution equals `targetVol` fraction of equity.
 */
export function volatilityTargetShares(input: VolTargetInput): number {
  const target = input.targetVol ?? 0.1;
  if (input.annualizedVol <= 0 || input.price <= 0) return 0;
  const notional = (input.account.equity * target) / input.annualizedVol;
  return Math.floor(notional / input.price);
}
