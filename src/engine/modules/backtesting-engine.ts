import { BaseEngine } from "../base-engine";
import { runBacktest } from "../backtesting/simulator";
import type { BacktestConfig, BacktestReport } from "../backtesting/types";

/**
 * Backtesting Engine — deterministic, event-driven bar-by-bar simulator.
 * Strategies are plain functions; no live data, no external dependencies.
 */
export class BacktestingEngine extends BaseEngine {
  constructor() {
    super("backtesting");
  }

  run(config: BacktestConfig): BacktestReport {
    return runBacktest(config);
  }

  protected async onHealthCheck() {
    return { deterministic: true };
  }
}
