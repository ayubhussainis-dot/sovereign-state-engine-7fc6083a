import { BaseEngine } from "../base-engine";

export type NewsScope = "market" | "company" | "sector" | "economy";

export interface NewsItem {
  id: string;
  scope: NewsScope;
  headline: string;
  source: string;
  url: string;
  publishedAt: number;
  symbols?: string[];
  summary?: string;
}

export interface NewsQuery {
  scope: NewsScope;
  symbols?: string[];
  since?: number;
  limit?: number;
}

export interface NewsProvider {
  readonly id: string;
  fetch(query: NewsQuery): Promise<NewsItem[]>;
}

/**
 * News Engine
 *
 * Aggregates registered news providers behind a single query surface.
 */
export class NewsEngine extends BaseEngine {
  private providers = new Map<string, NewsProvider>();

  constructor() {
    super("news");
  }

  registerProvider(provider: NewsProvider) {
    this.providers.set(provider.id, provider);
  }

  async query(q: NewsQuery): Promise<NewsItem[]> {
    if (this.providers.size === 0) return [];
    const batches = await Promise.all(
      Array.from(this.providers.values()).map((p) => p.fetch(q).catch(() => [])),
    );
    return batches.flat().sort((a, b) => b.publishedAt - a.publishedAt);
  }

  protected async onHealthCheck() {
    return { providers: Array.from(this.providers.keys()) };
  }
}
