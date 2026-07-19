import { BaseEngine } from "../base-engine";
import { analyzeStructure } from "../market-structure/analyzer";
import { detectPivots } from "../market-structure/pivots";
import type {
  OHLCBar,
  StructureAnalysis,
  StructureEvent,
  StructureOptions,
  SwingPoint,
} from "../market-structure/types";

/**
 * Market Structure Engine
 *
 * Internal, deterministic service that turns a sequence of OHLC bars into
 * a structural annotation: labeled swing pivots (HH / HL / LH / LL) and
 * structural events (BOS / CHoCH / MSS).
 *
 * No live data, no fake data, no UI. The engine is stateless per call —
 * callers supply bars and receive an analysis. This lets it be reused by
 * the future Liquidity, Order Block, FVG, Backtesting and AI Decision
 * engines without coupling.
 */
export class MarketStructureEngine extends BaseEngine {
  private defaults: Required<StructureOptions>;

  constructor(defaults: StructureOptions = {}) {
    super("market-structure");
    this.defaults = {
      lookback: defaults.lookback ?? 2,
      closeConfirmation: defaults.closeConfirmation ?? true,
      displacementThreshold: defaults.displacementThreshold ?? 0.001,
    };
  }

  /** Full structural analysis for a series of bars. */
  analyze(
    bars: readonly OHLCBar[],
    options: StructureOptions = {},
  ): StructureAnalysis {
    return analyzeStructure(bars, { ...this.defaults, ...options });
  }

  /** Just the labeled pivots — cheaper when events are not needed. */
  pivots(bars: readonly OHLCBar[], lookback?: number): SwingPoint[] {
    return detectPivots(bars, lookback ?? this.defaults.lookback);
  }

  /** Just the structural events. */
  events(
    bars: readonly OHLCBar[],
    options: StructureOptions = {},
  ): StructureEvent[] {
    return this.analyze(bars, options).events;
  }

  protected async onHealthCheck() {
    return {
      lookback: this.defaults.lookback,
      closeConfirmation: this.defaults.closeConfirmation,
      displacementThreshold: this.defaults.displacementThreshold,
    };
  }
}
