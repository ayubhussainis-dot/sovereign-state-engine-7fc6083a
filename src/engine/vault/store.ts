/**
 * Knowledge Vault — In-memory store.
 *
 * Deterministic, dependency-free storage for notes, categories, tags,
 * and relations. Persistence adapters can wrap this later; the engine
 * layer never assumes a specific backend.
 */

import type {
  VaultCategory,
  VaultId,
  VaultNote,
  VaultQuery,
  VaultRelation,
  VaultSourceKind,
  VaultStats,
  VaultTag,
} from "./types";

let __seq = 0;
const genId = (prefix: string) => {
  __seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${__seq.toString(36)}`;
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";

export class VaultStore {
  private notes = new Map<VaultId, VaultNote>();
  private categories = new Map<VaultId, VaultCategory>();
  private tags = new Map<VaultId, VaultTag>();
  private relations = new Map<VaultId, VaultRelation>();

  private categoryBySlug = new Map<string, VaultId>();
  private tagBySlug = new Map<string, VaultId>();

  // ---- Categories ----

  upsertCategory(
    input: { name: string; parent?: VaultId; description?: string },
  ): { category: VaultCategory; created: boolean } {
    const slug = slugify(input.name);
    const existingId = this.categoryBySlug.get(slug);
    if (existingId) {
      return { category: this.categories.get(existingId)!, created: false };
    }
    const cat: VaultCategory = {
      id: genId("cat"),
      name: input.name.trim(),
      slug,
      parent: input.parent,
      description: input.description,
      createdAt: Date.now(),
    };
    this.categories.set(cat.id, cat);
    this.categoryBySlug.set(slug, cat.id);
    return { category: cat, created: true };
  }

  getCategory(id: VaultId): VaultCategory | null {
    return this.categories.get(id) ?? null;
  }

  listCategories(): VaultCategory[] {
    return Array.from(this.categories.values());
  }

  // ---- Tags ----

  upsertTag(label: string): { tag: VaultTag; created: boolean } {
    const slug = slugify(label);
    const existingId = this.tagBySlug.get(slug);
    if (existingId) {
      return { tag: this.tags.get(existingId)!, created: false };
    }
    const tag: VaultTag = {
      id: genId("tag"),
      slug,
      label: label.trim(),
      createdAt: Date.now(),
    };
    this.tags.set(tag.id, tag);
    this.tagBySlug.set(slug, tag.id);
    return { tag, created: true };
  }

  getTag(id: VaultId): VaultTag | null {
    return this.tags.get(id) ?? null;
  }

  listTags(): VaultTag[] {
    return Array.from(this.tags.values());
  }

  // ---- Notes ----

  createNote(
    input: Omit<VaultNote, "id" | "createdAt" | "updatedAt"> &
      Partial<Pick<VaultNote, "createdAt">>,
  ): VaultNote {
    const now = Date.now();
    const note: VaultNote = {
      id: genId("note"),
      title: input.title.trim() || "Untitled",
      body: input.body ?? "",
      data: input.data,
      categories: input.categories ?? [],
      tags: input.tags ?? [],
      source: input.source,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
    this.notes.set(note.id, note);
    return note;
  }

  getNote(id: VaultId): VaultNote | null {
    return this.notes.get(id) ?? null;
  }

  listNotes(): VaultNote[] {
    return Array.from(this.notes.values());
  }

  deleteNote(id: VaultId): boolean {
    if (!this.notes.delete(id)) return false;
    // Cascade: drop any relations touching this note.
    for (const r of Array.from(this.relations.values())) {
      if (r.from === id || r.to === id) this.relations.delete(r.id);
    }
    return true;
  }

  // ---- Relations ----

  createRelation(
    input: Omit<VaultRelation, "id" | "createdAt">,
  ): VaultRelation {
    const rel: VaultRelation = {
      id: genId("rel"),
      createdAt: Date.now(),
      ...input,
    };
    this.relations.set(rel.id, rel);
    return rel;
  }

  listRelations(): VaultRelation[] {
    return Array.from(this.relations.values());
  }

  deleteRelation(id: VaultId): boolean {
    return this.relations.delete(id);
  }

  // ---- Search ----

  query(q: VaultQuery = {}): VaultNote[] {
    const needle = q.text?.toLowerCase().trim();
    const results: VaultNote[] = [];
    for (const note of this.notes.values()) {
      if (q.categoryId && !note.categories.includes(q.categoryId)) continue;
      if (q.tagId && !note.tags.includes(q.tagId)) continue;
      if (q.sourceKind && note.source.kind !== q.sourceKind) continue;
      if (q.createdAfter && note.createdAt < q.createdAfter) continue;
      if (q.createdBefore && note.createdAt > q.createdBefore) continue;
      if (needle) {
        const tagLabels = note.tags
          .map((t) => this.tags.get(t)?.label ?? "")
          .join(" ");
        const hay = `${note.title} ${note.body} ${tagLabels}`.toLowerCase();
        if (!hay.includes(needle)) continue;
      }
      results.push(note);
      if (q.limit && results.length >= q.limit) break;
    }
    return results;
  }

  stats(): VaultStats {
    const bySource: Record<VaultSourceKind, number> = {
      pdf: 0,
      image: 0,
      note: 0,
      json: 0,
    };
    for (const n of this.notes.values()) bySource[n.source.kind] += 1;
    return {
      notes: this.notes.size,
      categories: this.categories.size,
      tags: this.tags.size,
      relations: this.relations.size,
      bySource,
    };
  }
}
