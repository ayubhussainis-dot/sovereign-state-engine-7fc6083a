import { BaseEngine } from "../base-engine";

export type MarketSource = {
  id: string;
  read: () => Promise<unknown> | unknown;
};

/**
 * Market Reading Engine
 *
 * Reads every connected market information source. Makes no decisions,
 * organizes nothing — it strictly emits `market.tick` events with the raw
 * payload delivered by each source.
 */
export class MarketReadingEngine extends BaseEngine {
  private sources = new Map<string, MarketSource>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;
  private ticks = 0;

  constructor(intervalMs = 1_000) {
    super("market-reading");
    this.intervalMs = intervalMs;
  }

  registerSource(source: MarketSource) {
    this.sources.set(source.id, source);
  }

  removeSource(id: string) {
    this.sources.delete(id);
  }

  protected async onStart() {
    this.timer = setInterval(() => {
      void this.readOnce();
    }, this.intervalMs);
  }

  protected async onStop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async readOnce() {
    for (const source of this.sources.values()) {
      try {
        const payload = await source.read();
        this.ctx.bus.emit({
          type: "market.tick",
          source: source.id,
          payload,
          at: this.ctx.now(),
        });
        this.ticks += 1;
      } catch (error) {
        this.ctx.logger.warn("source read failed", {
          source: source.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  protected async onHealthCheck() {
    return {
      sources: Array.from(this.sources.keys()),
      totalTicks: this.ticks,
      intervalMs: this.intervalMs,
    };
  }
}
