/**
 * Knowledge Vault — Types
 *
 * The Vault is the writable, evolving companion to the read-only
 * Knowledge Foundation. Where the Foundation encodes what the operating
 * system knows before it observes any market, the Vault is where new
 * knowledge — notes, imported documents, distilled research — is stored,
 * organized, tagged, categorized, and related.
 *
 * The Vault contains NO market data and performs NO market analysis.
 * It is an organizational substrate future AI engines will consume.
 */

/** Stable identifier for any vault artifact. */
export type VaultId = string;

/** How a note entered the vault. */
export type VaultSourceKind = "pdf" | "image" | "note" | "json";

export interface VaultSource {
  kind: VaultSourceKind;
  /** Original filename / URI / handle. Never a market feed. */
  origin?: string;
  /** Byte size when known. */
  bytes?: number;
  /** MIME type when known. */
  mime?: string;
  /** Free-form provenance payload from the importer. */
  meta?: Record<string, unknown>;
}

/** Hierarchical category. `parent` may reference another category id. */
export interface VaultCategory {
  id: VaultId;
  name: string;
  slug: string;
  parent?: VaultId;
  description?: string;
  createdAt: number;
}

/** Flat tag. Tags are lowercase slugs; display casing lives in `label`. */
export interface VaultTag {
  id: VaultId;
  slug: string;
  label: string;
  createdAt: number;
}

/**
 * A single unit of knowledge stored in the vault. Notes are the vertex
 * type of the Knowledge Graph.
 */
export interface VaultNote {
  id: VaultId;
  title: string;
  /** Extracted text body. Empty string if the source has no text. */
  body: string;
  /** Optional structured payload (e.g. parsed JSON, image OCR blocks). */
  data?: Record<string, unknown>;
  categories: readonly VaultId[];
  tags: readonly VaultId[];
  source: VaultSource;
  createdAt: number;
  updatedAt: number;
}

/**
 * Directed edge in the Knowledge Graph. Edges may connect two vault
 * notes, or a vault note to a Knowledge Foundation entry addressed by
 * its fully qualified id `${domain}:${entryId}`.
 */
export type VaultEdgeKind =
  | "related"
  | "supports"
  | "contradicts"
  | "derives-from"
  | "cites"
  | "example-of"
  | "part-of";

export interface VaultRelation {
  id: VaultId;
  from: VaultId;
  to: VaultId;
  kind: VaultEdgeKind;
  /** Optional strength weight in [0, 1]. */
  weight?: number;
  note?: string;
  createdAt: number;
}

export interface VaultQuery {
  /** Case-insensitive substring across title, body, and tag labels. */
  text?: string;
  categoryId?: VaultId;
  tagId?: VaultId;
  sourceKind?: VaultSourceKind;
  /** Inclusive lower bound in ms epoch. */
  createdAfter?: number;
  /** Inclusive upper bound in ms epoch. */
  createdBefore?: number;
  limit?: number;
}

export interface VaultStats {
  notes: number;
  categories: number;
  tags: number;
  relations: number;
  bySource: Record<VaultSourceKind, number>;
}

/** Input passed to the import pipeline. */
export type VaultImportInput =
  | {
      kind: "pdf";
      /** Extracted text content. The pipeline itself does not run OCR. */
      text: string;
      title?: string;
      origin?: string;
      bytes?: number;
      meta?: Record<string, unknown>;
    }
  | {
      kind: "image";
      /** OCR / caption text if available. */
      text?: string;
      title?: string;
      origin?: string;
      bytes?: number;
      mime?: string;
      meta?: Record<string, unknown>;
    }
  | {
      kind: "note";
      title: string;
      body: string;
      tags?: readonly string[];
      categories?: readonly string[];
      meta?: Record<string, unknown>;
    }
  | {
      kind: "json";
      /** Arbitrary structured payload. */
      data: Record<string, unknown>;
      title?: string;
      origin?: string;
      meta?: Record<string, unknown>;
    };

export interface VaultImportResult {
  note: VaultNote;
  createdCategories: VaultCategory[];
  createdTags: VaultTag[];
}
