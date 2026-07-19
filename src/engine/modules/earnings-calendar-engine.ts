import { BaseEngine } from "../base-engine";

export type EarningsWindow = "before-open" | "after-close" | "during" | "unknown";

export interface EarningsEvent {
  symbol: string;
  company: string;
  scheduledAt: number;
  window: EarningsWindow;
  epsEstimate?: number;
  epsActual?: number;
  revenueEstimate?: number;
  revenueActual?: number;
}

export interface EarningsCalendarQuery {
  from: number;
  to: number;
  symbols?: string[];
  window?: EarningsWindow[];
}

export type EarningsCalendarSource = (
  q: EarningsCalendarQuery,
) => Promise<EarningsEvent[]>;

/**
 * Earnings Calendar Engine
 *
 * Serves scheduled earnings events. No fabrication — empty until a
 * source is registered.
 */
export class EarningsCalendarEngine extends BaseEngine {
  private source: EarningsCalendarSource | null = null;

  constructor() {
    super("earnings-calendar");
  }

  setSource(source: EarningsCalendarSource) {
    this.source = source;
  }

  async list(q: EarningsCalendarQuery): Promise<EarningsEvent[]> {
    if (!this.source) return [];
    return this.source(q);
  }

  protected async onHealthCheck() {
    return { hasSource: this.source !== null };
  }
}
