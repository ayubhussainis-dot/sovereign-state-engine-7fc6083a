/**
 * Knowledge Graph — projection over VaultStore relations.
 *
 * Vertices are addressed by their string id. Vault notes use their
 * VaultId directly; Knowledge Foundation entries use their fully
 * qualified id `${domain}:${entryId}` so the graph can span both worlds
 * without duplicating storage.
 *
 * The graph is a lightweight query surface; the store remains the
 * source of truth for edges.
 */

import type { VaultEdgeKind, VaultRelation } from "./types";

export interface GraphNeighbor {
  id: string;
  kind: VaultEdgeKind;
  direction: "out" | "in";
  weight?: number;
  relationId: string;
}

export class KnowledgeGraph {
  private outgoing = new Map<string, VaultRelation[]>();
  private incoming = new Map<string, VaultRelation[]>();

  constructor(relations: readonly VaultRelation[] = []) {
    for (const r of relations) this.add(r);
  }

  add(rel: VaultRelation): void {
    const outs = this.outgoing.get(rel.from) ?? [];
    outs.push(rel);
    this.outgoing.set(rel.from, outs);
    const ins = this.incoming.get(rel.to) ?? [];
    ins.push(rel);
    this.incoming.set(rel.to, ins);
  }

  remove(relationId: string): void {
    for (const map of [this.outgoing, this.incoming]) {
      for (const [k, list] of map) {
        const filtered = list.filter((r) => r.id !== relationId);
        if (filtered.length === 0) map.delete(k);
        else map.set(k, filtered);
      }
    }
  }

  /** Direct neighbors of `id` in either direction. */
  neighbors(id: string, kind?: VaultEdgeKind): GraphNeighbor[] {
    const out: GraphNeighbor[] = [];
    for (const r of this.outgoing.get(id) ?? []) {
      if (kind && r.kind !== kind) continue;
      out.push({
        id: r.to,
        kind: r.kind,
        direction: "out",
        weight: r.weight,
        relationId: r.id,
      });
    }
    for (const r of this.incoming.get(id) ?? []) {
      if (kind && r.kind !== kind) continue;
      out.push({
        id: r.from,
        kind: r.kind,
        direction: "in",
        weight: r.weight,
        relationId: r.id,
      });
    }
    return out;
  }

  /** Breadth-first traversal up to `depth`. Returns the visited set. */
  traverse(startId: string, depth = 2): Set<string> {
    const seen = new Set<string>([startId]);
    let frontier = [startId];
    for (let d = 0; d < depth && frontier.length > 0; d += 1) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const n of this.neighbors(id)) {
          if (seen.has(n.id)) continue;
          seen.add(n.id);
          next.push(n.id);
        }
      }
      frontier = next;
    }
    return seen;
  }

  /** Naive shortest path (BFS, ignores weight and direction). */
  shortestPath(from: string, to: string): string[] | null {
    if (from === to) return [from];
    const prev = new Map<string, string>();
    const queue = [from];
    const seen = new Set<string>([from]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const n of this.neighbors(cur)) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        prev.set(n.id, cur);
        if (n.id === to) {
          const path: string[] = [to];
          let step: string | undefined = to;
          while (step && prev.has(step)) {
            step = prev.get(step);
            if (step) path.unshift(step);
          }
          return path;
        }
        queue.push(n.id);
      }
    }
    return null;
  }
}
