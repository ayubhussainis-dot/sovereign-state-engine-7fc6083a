import { BaseEngine } from "../base-engine";
import type {
  LiveBar,
  LiveMarketHealth,
  LiveMarketProvider,
  LiveQuote,
  MarketSession,
  Unsubscribe,
} from "../live-market/types";

/**
 * Live Market Integration Engine
 *
 * Provider-agnostic bridge for live quotes, bars, and session state.
 * No provider is bundled — callers register one via `useProvider()`.
 *
 * Rules:
 *  - Never invents ticks, quotes, or bars.
 *  - Without a provider, all live methods throw and status reports
 *    "disconnected" so the UI/system health can surface the truth.
 */
export class LiveMarketEngine extends BaseEngine {
  private provider?: LiveMarketProvider;
  private subs: Set<Unsubscribe> = new Set();
  private lastError?: string;

  constructor() {
    super("live-market");
  }

  useProvider(provider: LiveMarketProvider): void {
    this.provider = provider;
  }

  hasProvider(): boolean {
    return !!this.provider;
  }

  async connect(): Promise<void> {
    if (!this.provider) throw new Error("live-market: no provider registered");
    try {
      await this.provider.connect();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    for (const off of this.subs) off();
    this.subs.clear();
    if (this.provider) await this.provider.disconnect();
  }

  subscribeQuotes(
    symbols: readonly string[],
    handler: (quote: LiveQuote) => void,
  ): Unsubscribe {
    if (!this.provider) throw new Error("live-market: no provider registered");
    const off = this.provider.subscribeQuotes(symbols, handler);
    this.subs.add(off);
    return () => {
      off();
      this.subs.delete(off);
    };
  }

  subscribeBars(
    symbols: readonly string[],
    timeframe: string,
    handler: (bar: LiveBar) => void,
  ): Unsubscribe {
    if (!this.provider) throw new Error("live-market: no provider registered");
    const off = this.provider.subscribeBars(symbols, timeframe, handler);
    this.subs.add(off);
    return () => {
      off();
      this.subs.delete(off);
    };
  }

  session(): MarketSession | "unknown" {
    return this.provider?.getSession() ?? "unknown";
  }

  health(): LiveMarketHealth {
    return {
      provider: this.provider?.name,
      status: this.provider?.status() ?? "disconnected",
      session: this.session(),
      subscriptions: this.subs.size,
      lastError: this.lastError,
    };
  }

  protected async onStop(): Promise<void> {
    await this.disconnect();
  }

  protected async onHealthCheck() {
    return this.health() as unknown as Record<string, unknown>;
  }
}
