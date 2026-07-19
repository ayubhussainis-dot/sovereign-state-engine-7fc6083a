import { BaseEngine } from "../base-engine";

export interface OrganizedRecord {
  symbol?: string;
  company?: string;
  sector?: string;
  industry?: string;
  etfs?: string[];
  indices?: string[];
  session?: "pre" | "open" | "after" | "closed";
  source: string;
  receivedAt: number;
  raw: unknown;
}

export type Organizer = (payload: unknown, source: string) => OrganizedRecord | null;

/**
 * Market Organization Engine
 *
 * Turns raw market ticks into structured relationships: company, sector,
 * industry, ETF, index, session. Organizers are plugged in; the engine
 * itself is agnostic about the specific taxonomy.
 */
export class MarketOrganizationEngine extends BaseEngine {
  private organizers: Organizer[] = [];
  private organized = 0;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super("market-organization");
  }

  registerOrganizer(organizer: Organizer) {
    this.organizers.push(organizer);
  }

  protected async onStart() {
    this.unsubscribe = this.ctx.bus.on("market.tick", (event) => {
      this.organize(event.payload, event.source);
    });
  }

  protected async onStop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private organize(payload: unknown, source: string) {
    for (const organizer of this.organizers) {
      const record = organizer(payload, source);
      if (!record) continue;
      this.organized += 1;
      this.ctx.bus.emit({
        type: "market.organized",
        payload: { ...record, receivedAt: this.ctx.now() },
        at: this.ctx.now(),
      });
    }
  }

  protected async onHealthCheck() {
    return {
      organizers: this.organizers.length,
      totalOrganized: this.organized,
    };
  }
}
