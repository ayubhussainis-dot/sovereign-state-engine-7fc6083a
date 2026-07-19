import { BaseEngine } from "../base-engine";

export type WatchlistKind =
  | "personal"
  | "ai-generated"
  | "sector"
  | "earnings"
  | "favorites"
  | "recently-viewed";

export interface Watchlist {
  id: string;
  name: string;
  kind: WatchlistKind;
  symbols: string[];
  updatedAt: number;
}

/**
 * Watchlist Engine
 *
 * In-memory registry of watchlists. Persistence layers can subscribe
 * externally; this engine itself makes no I/O calls.
 */
export class WatchlistEngine extends BaseEngine {
  private lists = new Map<string, Watchlist>();

  constructor() {
    super("watchlist");
  }

  create(list: Omit<Watchlist, "updatedAt">): Watchlist {
    const wl: Watchlist = { ...list, updatedAt: this.ctx.now() };
    this.lists.set(wl.id, wl);
    return wl;
  }

  update(id: string, patch: Partial<Omit<Watchlist, "id">>): Watchlist | null {
    const wl = this.lists.get(id);
    if (!wl) return null;
    const next: Watchlist = { ...wl, ...patch, id, updatedAt: this.ctx.now() };
    this.lists.set(id, next);
    return next;
  }

  remove(id: string): boolean {
    return this.lists.delete(id);
  }

  get(id: string): Watchlist | null {
    return this.lists.get(id) ?? null;
  }

  listByKind(kind: WatchlistKind): Watchlist[] {
    return Array.from(this.lists.values()).filter((w) => w.kind === kind);
  }

  all(): Watchlist[] {
    return Array.from(this.lists.values());
  }

  protected async onHealthCheck() {
    return { count: this.lists.size };
  }
}
