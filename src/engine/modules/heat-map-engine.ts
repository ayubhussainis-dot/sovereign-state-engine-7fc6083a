import { BaseEngine } from "../base-engine";

export type HeatMapScope = "sp500" | "nasdaq" | "sector" | "industry" | "etf";

export interface HeatMapCell {
  key: string;
  label: string;
  value: number;
  weight: number;
  parent?: string;
}

export interface HeatMapSnapshot {
  scope: HeatMapScope;
  cells: HeatMapCell[];
  generatedAt: number;
}

export type HeatMapSource = (scope: HeatMapScope) => Promise<HeatMapSnapshot | null>;

/**
 * Heat Map Engine
 *
 * Builds heat map snapshots for any registered scope. Returns null when
 * no source has been connected.
 */
export class HeatMapEngine extends BaseEngine {
  private source: HeatMapSource | null = null;
  private cache = new Map<HeatMapScope, HeatMapSnapshot>();

  constructor() {
    super("heat-map");
  }

  setSource(source: HeatMapSource) {
    this.source = source;
  }

  async getSnapshot(scope: HeatMapScope): Promise<HeatMapSnapshot | null> {
    if (!this.source) return null;
    const snap = await this.source(scope);
    if (snap) this.cache.set(scope, snap);
    return snap;
  }

  getCached(scope: HeatMapScope): HeatMapSnapshot | null {
    return this.cache.get(scope) ?? null;
  }

  protected async onHealthCheck() {
    return { hasSource: this.source !== null, cached: this.cache.size };
  }
}
