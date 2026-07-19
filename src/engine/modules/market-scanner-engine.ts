import { BaseEngine } from "../base-engine";

export type ScannerField =
  | "price"
  | "volume"
  | "relativeVolume"
  | "float"
  | "marketCap"
  | "atr"
  | "gapUp"
  | "gapDown"
  | "newHigh"
  | "newLow"
  | "breakout"
  | "breakdown"
  | "momentum"
  | "volatility";

export type Comparator = "gt" | "gte" | "lt" | "lte" | "eq" | "between";

export interface ScannerFilter {
  field: ScannerField;
  op: Comparator;
  value: number | [number, number] | boolean;
}

export interface ScannerCriteria {
  id: string;
  name: string;
  filters: ScannerFilter[];
  limit?: number;
}

export interface ScannerResult {
  symbol: string;
  matched: Record<string, unknown>;
  scannedAt: number;
}

export type ScannerSource = (criteria: ScannerCriteria) => Promise<ScannerResult[]>;

/**
 * Market Scanner Engine
 *
 * Registry of scanner criteria + pluggable source that runs them. Runs
 * only when a source is registered; otherwise returns empty results.
 */
export class MarketScannerEngine extends BaseEngine {
  private criteria = new Map<string, ScannerCriteria>();
  private source: ScannerSource | null = null;

  constructor() {
    super("market-scanner");
  }

  setSource(source: ScannerSource) {
    this.source = source;
  }

  saveCriteria(criteria: ScannerCriteria) {
    this.criteria.set(criteria.id, criteria);
  }

  removeCriteria(id: string) {
    this.criteria.delete(id);
  }

  listCriteria(): ScannerCriteria[] {
    return Array.from(this.criteria.values());
  }

  async run(id: string): Promise<ScannerResult[]> {
    const c = this.criteria.get(id);
    if (!c || !this.source) return [];
    return this.source(c);
  }

  protected async onHealthCheck() {
    return { criteria: this.criteria.size, hasSource: this.source !== null };
  }
}
