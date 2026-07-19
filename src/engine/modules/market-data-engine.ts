import { BaseEngine } from "../base-engine";

export type MarketSession = "pre" | "open" | "after" | "closed" | "unknown";

export interface Quote {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  volume?: number;
  timestamp: number;
}

export interface Bar {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  timeframe: string;
}

export interface MarketDataProvider {
  readonly id: string;
  isConnected(): boolean;
  getQuote(symbol: string): Promise<Quote | null>;
  getBars(symbol: string, timeframe: string, limit?: number): Promise<Bar[]>;
  getSession(): Promise<MarketSession>;
  subscribe?(symbol: string, onQuote: (q: Quote) => void): () => void;
}

/**
 * Market Data Engine
 *
 * Unified access surface for U.S. market data (indices, stocks, ETFs).
 * A provider must be registered before any read succeeds. No fake data
 * is ever synthesized.
 */
export class MarketDataEngine extends BaseEngine {
  private provider: MarketDataProvider | null = null;

  constructor() {
    super("market-data");
  }

  registerProvider(provider: MarketDataProvider) {
    this.provider = provider;
  }

  hasProvider(): boolean {
    return this.provider !== null && this.provider.isConnected();
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    if (!this.provider) return null;
    return this.provider.getQuote(symbol);
  }

  async getBars(symbol: string, timeframe: string, limit?: number): Promise<Bar[]> {
    if (!this.provider) return [];
    return this.provider.getBars(symbol, timeframe, limit);
  }

  async getSession(): Promise<MarketSession> {
    if (!this.provider) return "unknown";
    return this.provider.getSession();
  }

  protected async onHealthCheck() {
    return {
      provider: this.provider?.id ?? null,
      connected: this.hasProvider(),
    };
  }
}
