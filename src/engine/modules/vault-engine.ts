import { BaseEngine } from "../base-engine";
import { KnowledgeGraph } from "../vault/graph";
import { VaultImportPipeline } from "../vault/importers";
import { VaultStore } from "../vault/store";
import type {
  VaultCategory,
  VaultEdgeKind,
  VaultId,
  VaultImportInput,
  VaultImportResult,
  VaultNote,
  VaultQuery,
  VaultRelation,
  VaultStats,
  VaultTag,
} from "../vault/types";

/**
 * Vault Engine
 *
 * Owns the writable Knowledge Vault: notes, categories, tags, and the
 * Knowledge Graph of relations between vault notes and Knowledge
 * Foundation entries. The engine is a thin facade over the store,
 * graph, and import pipeline so the rest of the system depends on a
 * single surface.
 *
 * Guarantees:
 *  - No market data. No trading logic. No fake data.
 *  - Deterministic given the same input order.
 *  - Graph stays consistent with the store on every mutation.
 */
export class VaultEngine extends BaseEngine {
  private readonly store = new VaultStore();
  private readonly graph = new KnowledgeGraph();
  private readonly pipeline = new VaultImportPipeline(this.store);

  constructor() {
    super("vault");
  }

  // ---- Notes ----
  createNote(input: Omit<VaultNote, "id" | "createdAt" | "updatedAt">): VaultNote {
    return this.store.createNote(input);
  }
  getNote(id: VaultId): VaultNote | null {
    return this.store.getNote(id);
  }
  listNotes(): VaultNote[] {
    return this.store.listNotes();
  }
  deleteNote(id: VaultId): boolean {
    const ok = this.store.deleteNote(id);
    if (ok) {
      // Rebuild graph from surviving relations for consistency.
      this.rebuildGraph();
    }
    return ok;
  }
  search(q: VaultQuery = {}): VaultNote[] {
    return this.store.query(q);
  }

  // ---- Tags ----
  upsertTag(label: string): VaultTag {
    return this.store.upsertTag(label).tag;
  }
  listTags(): VaultTag[] {
    return this.store.listTags();
  }

  // ---- Categories ----
  upsertCategory(input: { name: string; parent?: VaultId; description?: string }): VaultCategory {
    return this.store.upsertCategory(input).category;
  }
  listCategories(): VaultCategory[] {
    return this.store.listCategories();
  }

  // ---- Relations / Graph ----
  relate(input: {
    from: VaultId;
    to: VaultId;
    kind: VaultEdgeKind;
    weight?: number;
    note?: string;
  }): VaultRelation {
    const rel = this.store.createRelation(input);
    this.graph.add(rel);
    return rel;
  }
  unrelate(relationId: VaultId): boolean {
    const ok = this.store.deleteRelation(relationId);
    if (ok) this.graph.remove(relationId);
    return ok;
  }
  neighbors(id: string, kind?: VaultEdgeKind) {
    return this.graph.neighbors(id, kind);
  }
  traverse(startId: string, depth = 2) {
    return this.graph.traverse(startId, depth);
  }
  shortestPath(from: string, to: string) {
    return this.graph.shortestPath(from, to);
  }

  // ---- Import pipeline ----
  import(input: VaultImportInput): VaultImportResult {
    return this.pipeline.import(input);
  }

  stats(): VaultStats {
    return this.store.stats();
  }

  private rebuildGraph() {
    // Recreate a fresh graph from the surviving relations. Cheap for
    // the small graphs this phase deals with; can be replaced by
    // incremental removal later without changing the public surface.
    const relations = this.store.listRelations();
    // biome-ignore lint: intentional mutation of private field via assignment.
    (this as unknown as { graph: KnowledgeGraph }).graph = new KnowledgeGraph(relations);
  }

  protected async onHealthCheck() {
    const s = this.stats();
    return {
      notes: s.notes,
      categories: s.categories,
      tags: s.tags,
      relations: s.relations,
    };
  }
}
