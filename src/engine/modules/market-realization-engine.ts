import { BaseEngine } from "../base-engine";

export interface RealizationRecord {
  context: string;
  signals: Record<string, unknown>;
  derivedAt: number;
  source: string;
}

export type Realizer = (organized: unknown) => RealizationRecord | null;

/**
 * Market Realization Engine
 *
 * Transforms organized market information into contextual understanding —
 * regime, breadth, session character, relationships. Emits
 * `market.realization` events. No trading decisions are generated here.
 */
export class MarketRealizationEngine extends BaseEngine {
  private realizers: Realizer[] = [];
  private realizations = 0;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super("market-realization");
  }

  registerRealizer(realizer: Realizer) {
    this.realizers.push(realizer);
  }

  protected async onStart() {
    this.unsubscribe = this.ctx.bus.on("market.organized", (event) => {
      for (const realizer of this.realizers) {
        const record = realizer(event.payload);
        if (!record) continue;
        this.realizations += 1;
        this.ctx.bus.emit({
          type: "market.realization",
          payload: { ...record, derivedAt: this.ctx.now() },
          at: this.ctx.now(),
        });
      }
    });
  }

  protected async onStop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  protected async onHealthCheck() {
    return {
      realizers: this.realizers.length,
      totalRealizations: this.realizations,
    };
  }
}
