/**
 * Knowledge Foundation — Types
 *
 * The Knowledge Foundation is a permanent, curated body of professional
 * trading knowledge the operating system possesses BEFORE it observes any
 * live market. It is not market data, not fake data, and not a decision
 * engine. It is reference knowledge — definitions, taxonomies, rules of
 * thumb, workflows, and structural facts — that future AI engines
 * (reading, organization, realization, candidate generation, alerts,
 * scanners, risk, execution) consume as ground truth.
 *
 * Design principles:
 *  - Curated and factual. No opinions presented as fact.
 *  - Stable identifiers. Consumers key on `id`.
 *  - Machine-readable first, human-readable second.
 *  - Extensible without breaking existing consumers.
 *  - Zero UI coupling.
 */

export type KnowledgeDomainId =
  | "market-structure"
  | "market-microstructure"
  | "liquidity"
  | "volatility"
  | "order-types"
  | "technical-analysis"
  | "price-action"
  | "candlestick-analysis"
  | "indicators"
  | "chart-patterns"
  | "fundamental-analysis"
  | "company-analysis"
  | "sector-analysis"
  | "industry-analysis"
  | "economic-indicators"
  | "earnings-analysis"
  | "options"
  | "etf"
  | "portfolio-management"
  | "risk-management"
  | "position-sizing"
  | "trading-psychology"
  | "market-terminology"
  | "professional-workflows";

export type KnowledgeCategory =
  | "concept"
  | "definition"
  | "taxonomy"
  | "formula"
  | "pattern"
  | "indicator"
  | "workflow"
  | "rule"
  | "heuristic"
  | "reference";

/**
 * A single atomic piece of knowledge. Every entry is addressable by
 * `${domain}:${id}` and carries structured fields alongside prose.
 */
export interface KnowledgeEntry {
  id: string;
  domain: KnowledgeDomainId;
  category: KnowledgeCategory;
  title: string;
  summary: string;
  /** Long-form description. Optional; some entries are pure structure. */
  description?: string;
  /** Free-form tags used by scanners, alerts, and search. */
  tags?: readonly string[];
  /** Related entries (fully qualified `${domain}:${id}`). */
  related?: readonly string[];
  /**
   * Optional structured payload. Shape depends on `category` and is
   * validated by domain-specific consumers, not by the engine itself.
   */
  data?: Record<string, unknown>;
}

export interface KnowledgeDomain {
  id: KnowledgeDomainId;
  title: string;
  summary: string;
  entries: readonly KnowledgeEntry[];
}

export interface KnowledgeQuery {
  domain?: KnowledgeDomainId;
  category?: KnowledgeCategory;
  tag?: string;
  /** Case-insensitive substring match over title + summary + tags. */
  text?: string;
}

export interface KnowledgeStats {
  domains: number;
  entries: number;
  byDomain: Record<string, number>;
  byCategory: Record<string, number>;
}
