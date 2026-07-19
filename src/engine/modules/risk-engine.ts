import { BaseEngine } from "../base-engine";
import {
  assessPortfolioRisk,
  calculatePositionSize,
  computeDrawdown,
  rMultiple,
  volatilityTargetShares,
} from "../risk/calculator";
import type {
  DrawdownStats,
  EquityPoint,
  OpenExposure,
  PortfolioRisk,
  RMultipleInput,
  RiskAccount,
  SizingInput,
  SizingResult,
  VolTargetInput,
} from "../risk/types";

/**
 * Risk Engine — position sizing, R-multiples, portfolio exposure, and
 * drawdown analytics. Pure functions wrapped for lifecycle uniformity.
 */
export class RiskEngine extends BaseEngine {
  constructor() {
    super("risk");
  }

  size(input: SizingInput): SizingResult {
    return calculatePositionSize(input);
  }

  r(input: RMultipleInput): number {
    return rMultiple(input);
  }

  portfolio(account: RiskAccount, positions: readonly OpenExposure[]): PortfolioRisk {
    return assessPortfolioRisk(account, positions);
  }

  drawdown(curve: readonly EquityPoint[]): DrawdownStats {
    return computeDrawdown(curve);
  }

  volTargetShares(input: VolTargetInput): number {
    return volatilityTargetShares(input);
  }

  protected async onHealthCheck() {
    return { pure: true };
  }
}
