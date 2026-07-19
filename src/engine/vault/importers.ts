/**
 * Knowledge Vault — Import pipeline.
 *
 * Dispatches a `VaultImportInput` to the correct normalizer, produces a
 * `VaultNote` (plus any newly created categories/tags), and writes it to
 * the store. Importers here are format-agnostic: callers are expected to
 * have already extracted text from PDFs, run OCR on images, etc. The
 * pipeline exists so a single call site handles categories, tags, and
 * source metadata consistently regardless of format.
 */

import { VaultStore } from "./store";
import type {
  VaultCategory,
  VaultId,
  VaultImportInput,
  VaultImportResult,
  VaultNote,
  VaultTag,
} from "./types";

const truncate = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;

const deriveTitle = (candidate: string | undefined, body: string) => {
  const fromCandidate = candidate?.trim();
  if (fromCandidate) return fromCandidate;
  const firstLine = body.split(/\r?\n/).find((line) => line.trim().length > 0);
  return truncate((firstLine ?? "Untitled").trim(), 120);
};

export class VaultImportPipeline {
  constructor(private readonly store: VaultStore) {}

  import(input: VaultImportInput): VaultImportResult {
    switch (input.kind) {
      case "pdf":
        return this.importPdf(input);
      case "image":
        return this.importImage(input);
      case "note":
        return this.importNote(input);
      case "json":
        return this.importJson(input);
    }
  }

  private resolveTags(labels: readonly string[] | undefined) {
    const created: VaultTag[] = [];
    const ids: VaultId[] = [];
    for (const label of labels ?? []) {
      if (!label.trim()) continue;
      const { tag, created: isNew } = this.store.upsertTag(label);
      if (isNew) created.push(tag);
      if (!ids.includes(tag.id)) ids.push(tag.id);
    }
    return { ids, created };
  }

  private resolveCategories(names: readonly string[] | undefined) {
    const created: VaultCategory[] = [];
    const ids: VaultId[] = [];
    for (const name of names ?? []) {
      if (!name.trim()) continue;
      const { category, created: isNew } = this.store.upsertCategory({ name });
      if (isNew) created.push(category);
      if (!ids.includes(category.id)) ids.push(category.id);
    }
    return { ids, created };
  }

  private finalize(
    partial: Omit<VaultNote, "id" | "createdAt" | "updatedAt">,
    createdCategories: VaultCategory[],
    createdTags: VaultTag[],
  ): VaultImportResult {
    const note = this.store.createNote(partial);
    return { note, createdCategories, createdTags };
  }

  private importPdf(input: Extract<VaultImportInput, { kind: "pdf" }>) {
    const cats = this.resolveCategories(["Documents", "PDF"]);
    const tags = this.resolveTags(["import", "pdf"]);
    return this.finalize(
      {
        title: deriveTitle(input.title, input.text),
        body: input.text,
        categories: cats.ids,
        tags: tags.ids,
        source: {
          kind: "pdf",
          origin: input.origin,
          bytes: input.bytes,
          mime: "application/pdf",
          meta: input.meta,
        },
      },
      cats.created,
      tags.created,
    );
  }

  private importImage(input: Extract<VaultImportInput, { kind: "image" }>) {
    const cats = this.resolveCategories(["Media", "Image"]);
    const tags = this.resolveTags(["import", "image"]);
    return this.finalize(
      {
        title: deriveTitle(input.title, input.text ?? ""),
        body: input.text ?? "",
        categories: cats.ids,
        tags: tags.ids,
        source: {
          kind: "image",
          origin: input.origin,
          bytes: input.bytes,
          mime: input.mime,
          meta: input.meta,
        },
      },
      cats.created,
      tags.created,
    );
  }

  private importNote(input: Extract<VaultImportInput, { kind: "note" }>) {
    const cats = this.resolveCategories(input.categories ?? ["Notes"]);
    const tags = this.resolveTags(input.tags);
    return this.finalize(
      {
        title: deriveTitle(input.title, input.body),
        body: input.body,
        categories: cats.ids,
        tags: tags.ids,
        source: { kind: "note", meta: input.meta },
      },
      cats.created,
      tags.created,
    );
  }

  private importJson(input: Extract<VaultImportInput, { kind: "json" }>) {
    const cats = this.resolveCategories(["Data", "JSON"]);
    const tags = this.resolveTags(["import", "json"]);
    const preview = truncate(JSON.stringify(input.data, null, 2), 4000);
    return this.finalize(
      {
        title: deriveTitle(input.title, preview),
        body: preview,
        data: input.data,
        categories: cats.ids,
        tags: tags.ids,
        source: {
          kind: "json",
          origin: input.origin,
          mime: "application/json",
          meta: input.meta,
        },
      },
      cats.created,
      tags.created,
    );
  }
}
