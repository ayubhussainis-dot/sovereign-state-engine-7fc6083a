import { BaseEngine } from "../base-engine";

export type EconomicImpact = "low" | "medium" | "high";

export type EconomicKind =
  | "cpi"
  | "fomc"
  | "gdp"
  | "jobs"
  | "inflation"
  | "interest-rate"
  | "other";

export interface EconomicEvent {
  id: string;
  kind: EconomicKind;
  title: string;
  country: string;
  impact: EconomicImpact;
  scheduledAt: number;
  actual?: number | string;
  forecast?: number | string;
  previous?: number | string;
}

export interface EconomicCalendarQuery {
  from: number;
  to: number;
  impact?: EconomicImpact[];
  kinds?: EconomicKind[];
}

export type EconomicCalendarSource = (
  q: EconomicCalendarQuery,
) => Promise<EconomicEvent[]>;

/**
 * Economic Calendar Engine
 *
 * Serves economic events from a registered source. Returns [] until a
 * source is wired.
 */
export class EconomicCalendarEngine extends BaseEngine {
  private source: EconomicCalendarSource | null = null;

  constructor() {
    super("economic-calendar");
  }

  setSource(source: EconomicCalendarSource) {
    this.source = source;
  }

  async list(q: EconomicCalendarQuery): Promise<EconomicEvent[]> {
    if (!this.source) return [];
    return this.source(q);
  }

  protected async onHealthCheck() {
    return { hasSource: this.source !== null };
  }
}
