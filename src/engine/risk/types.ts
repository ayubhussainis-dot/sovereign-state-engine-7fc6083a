/**
 * Risk Engine — Types
 *
 * Position sizing, R-multiples, portfolio exposure, drawdown, and
 * volatility-scaled risk. Pure math, deterministic.
 */

export type RiskSide = "long" | "short";

export interface RiskAccount {
  equity: number;
  cash: number;
  /** Optional cap on total portfolio risk (fraction of equity). */
  maxPortfolioRisk?: number;
  /** Optional cap on single-position risk (fraction of equity). */
  maxPositionRisk?: number;
}

export interface SizingInput {
  account: RiskAccount;
  side: RiskSide;
  entry: number;
  stop: number;
  /** Fraction of equity to risk on this trade. Defaults 0.01 (1R = 1%). */
  riskPerTrade?: number;
  /** Optional cap on notional as fraction of equity. Defaults 1 (100%). */
  maxNotionalFraction?: number;
}

export interface SizingResult {
  shares: number;
  notional: number;
  riskAmount: number;
  riskPerShare: number;
  rMultipleAtTarget?: number;
  capped: boolean;
  reason?: string;
}

export interface RMultipleInput {
  side: RiskSide;
  entry: number;
  stop: number;
  exit: number;
}

export interface OpenExposure {
  symbol: string;
  side: RiskSide;
  entry: number;
  stop: number;
  shares: number;
}

export interface PortfolioRisk {
  totalRisk: number;
  totalRiskFraction: number;
  perPosition: Array<{
    symbol: string;
    risk: number;
    fraction: number;
  }>;
  breach?: string;
}

export interface EquityPoint {
  time: number;
  equity: number;
}

export interface DrawdownStats {
  maxDrawdown: number;
  maxDrawdownFraction: number;
  peak: number;
  trough: number;
  peakAt?: number;
  troughAt?: number;
  currentDrawdown: number;
  currentDrawdownFraction: number;
}

export interface VolTargetInput {
  account: RiskAccount;
  price: number;
  /** Annualized volatility (e.g. 0.25 for 25%). */
  annualizedVol: number;
  /** Target annualized portfolio vol contribution. Defaults 0.10. */
  targetVol?: number;
}
