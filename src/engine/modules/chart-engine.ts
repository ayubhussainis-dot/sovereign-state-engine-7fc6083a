import { BaseEngine } from "../base-engine";
import type { Bar } from "./market-data-engine";

export type ChartType = "candlestick" | "line" | "area" | "volume";
export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1D" | "1W" | "1M";

export interface Indicator {
  id: string;
  name: string;
  params: Record<string, unknown>;
}

export interface DrawingTool {
  id: string;
  kind: "trendline" | "horizontal" | "vertical" | "fib" | "rect";
  points: Array<{ time: number; price: number }>;
}

export interface ChartConfig {
  symbol: string;
  type: ChartType;
  timeframe: Timeframe;
  indicators: Indicator[];
  drawings: DrawingTool[];
}

export type BarsLoader = (symbol: string, tf: Timeframe, limit?: number) => Promise<Bar[]>;

/**
 * Chart Engine
 *
 * Owns chart configuration state (type, timeframe, indicators, drawings)
 * and delegates bar loading to the Market Data Engine or any injected
 * loader. Rendering is left to the UI layer.
 */
export class ChartEngine extends BaseEngine {
  private configs = new Map<string, ChartConfig>();
  private loader: BarsLoader | null = null;

  constructor() {
    super("chart");
  }

  setLoader(loader: BarsLoader) {
    this.loader = loader;
  }

  getConfig(chartId: string): ChartConfig | null {
    return this.configs.get(chartId) ?? null;
  }

  upsertConfig(chartId: string, config: ChartConfig) {
    this.configs.set(chartId, config);
  }

  addIndicator(chartId: string, indicator: Indicator) {
    const c = this.configs.get(chartId);
    if (!c) return;
    c.indicators.push(indicator);
  }

  addDrawing(chartId: string, drawing: DrawingTool) {
    const c = this.configs.get(chartId);
    if (!c) return;
    c.drawings.push(drawing);
  }

  async loadBars(chartId: string, limit?: number): Promise<Bar[]> {
    const c = this.configs.get(chartId);
    if (!c || !this.loader) return [];
    return this.loader(c.symbol, c.timeframe, limit);
  }

  protected async onHealthCheck() {
    return { charts: this.configs.size, hasLoader: this.loader !== null };
  }
}
