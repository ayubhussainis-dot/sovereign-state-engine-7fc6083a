/**
 * Risk Authority — portfolio-level circuit breaker. Combines drawdown
 * fraction and consecutive-loss count into a single trading verdict.
 *
 * Complements (does not replace) HETIS's `assessPortfolioRisk` and
 * `computeDrawdown` in `src/engine/risk/calculator.ts`.
 */

export type AuthorityState = "NORMAL" | "CAUTION" | "RESTRICTED" | "HALTED";

export interface AuthorityInput {
  drawdownFraction: number;
  consecutiveLosses: number;
}

export interface AuthorityReading {
  state: AuthorityState;
  canTrade: boolean;
  reason: string;
}

export function evaluateAuthority(input: AuthorityInput): AuthorityReading {
  const dd = Math.max(0, input.drawdownFraction);
  const losses = Math.max(0, input.consecutiveLosses);

  if (dd > 0.05 || losses >= 20) {
    return {
      state: "HALTED",
      canTrade: false,
      reason: `Halted — dd ${(dd * 100).toFixed(2)}%, ${losses} consec losses`,
    };
  }
  if (dd > 0.03 || losses >= 10) {
    return {
      state: "RESTRICTED",
      canTrade: false,
      reason: `Restricted — dd ${(dd * 100).toFixed(2)}%, ${losses} consec losses`,
    };
  }
  if (dd > 0.02) {
    return {
      state: "CAUTION",
      canTrade: true,
      reason: `Caution — dd ${(dd * 100).toFixed(2)}%`,
    };
  }
  return { state: "NORMAL", canTrade: true, reason: "Within envelope" };
}
