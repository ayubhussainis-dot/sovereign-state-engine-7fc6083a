import { BaseEngine } from "../base-engine";
import { KNOWLEDGE_DOMAINS } from "../knowledge";
import type {
  KnowledgeCategory,
  KnowledgeDomain,
  KnowledgeDomainId,
  KnowledgeEntry,
  KnowledgeQuery,
  KnowledgeStats,
} from "../knowledge/types";

/**
 * Knowledge Engine
 *
 * Owns the permanent Knowledge Foundation — the professional trading
 * knowledge the operating system possesses BEFORE it observes any live
 * market. It is read-only reference material (definitions, taxonomies,
 * formulas, workflows, rules of thumb). Future AI engines consume this
 * as ground truth so they never re-learn fundamentals.
 *
 * Guarantees:
 *  - No market data, no live prices, no fake data.
 *  - Deterministic: same query returns the same result.
 *  - Read-only from the outside; extensions register additional domains
 *    at init time via the constructor for future consumers.
 */
export class KnowledgeEngine extends BaseEngine {
  private domains = new Map<KnowledgeDomainId, KnowledgeDomain>();
  private index = new Map<string, KnowledgeEntry>();

  constructor(domains: readonly KnowledgeDomain[] = KNOWLEDGE_DOMAINS) {
    super("knowledge");
    for (const d of domains) this.registerDomain(d);
  }

  private key(domain: KnowledgeDomainId, id: string) {
    return `${domain}:${id}`;
  }

  private registerDomain(domain: KnowledgeDomain) {
    this.domains.set(domain.id, domain);
    for (const entry of domain.entries) {
      this.index.set(this.key(domain.id, entry.id), entry);
    }
  }

  listDomains(): KnowledgeDomain[] {
    return Array.from(this.domains.values());
  }

  getDomain(id: KnowledgeDomainId): KnowledgeDomain | null {
    return this.domains.get(id) ?? null;
  }

  getEntry(domain: KnowledgeDomainId, id: string): KnowledgeEntry | null {
    return this.index.get(this.key(domain, id)) ?? null;
  }

  /** Resolve by fully qualified id `${domain}:${entryId}`. */
  resolve(qualifiedId: string): KnowledgeEntry | null {
    return this.index.get(qualifiedId) ?? null;
  }

  query(q: KnowledgeQuery = {}): KnowledgeEntry[] {
    const needle = q.text?.toLowerCase().trim();
    const cat: KnowledgeCategory | undefined = q.category;
    const tag = q.tag?.toLowerCase();
    const results: KnowledgeEntry[] = [];
    const domains = q.domain
      ? [this.domains.get(q.domain)].filter(Boolean) as KnowledgeDomain[]
      : this.listDomains();
    for (const d of domains) {
      for (const e of d.entries) {
        if (cat && e.category !== cat) continue;
        if (tag && !(e.tags ?? []).some((t) => t.toLowerCase() === tag)) continue;
        if (needle) {
          const hay = [
            e.title,
            e.summary,
            e.description ?? "",
            (e.tags ?? []).join(" "),
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(needle)) continue;
        }
        results.push(e);
      }
    }
    return results;
  }

  stats(): KnowledgeStats {
    const byDomain: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let entries = 0;
    for (const d of this.domains.values()) {
      byDomain[d.id] = d.entries.length;
      entries += d.entries.length;
      for (const e of d.entries) {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
      }
    }
    return { domains: this.domains.size, entries, byDomain, byCategory };
  }

  protected async onHealthCheck() {
    const s = this.stats();
    return { domains: s.domains, entries: s.entries };
  }
}
