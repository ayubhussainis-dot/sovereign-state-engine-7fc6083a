/**
 * Audit Ledger — append-only, hash-chained event log for the MDT.
 *
 * Distinct from the legacy `src/lib/ledger.ts` (SDTState transitions)
 * and `src/engine/sovereign/event-ledger.ts` (sovereign events). This is
 * the tamper-evident audit spine for the twin → PPG → SOALL → Authority
 * pipeline.
 *
 * Determinism: hashing is a pure fold over the ordered entry sequence.
 * Replaying the same input events yields an identical hash chain. All
 * timestamps are caller-supplied.
 */

import type { GateReport } from "@/soall/types";

export type AuditKind =
  | "TWIN_TICK"
  | "PPG_SNAPSHOT"
  | "GATE_REPORT"
  | "ORDER_INTENT"
  | "ORDER_FILLED"
  | "TRADE_CLOSED"
  | "AUTHORITY_VETO";

export interface AuditEntry {
  seq: number;
  ts: number;
  kind: AuditKind;
  payload: Readonly<Record<string, unknown>>;
  prevHash: string;
  hash: string;
}

/** Deterministic 32-bit FNV-1a → hex. Cheap, dependency-free. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  );
}

export class AuditLedger {
  private readonly capacity: number;
  private readonly buf: AuditEntry[] = [];
  private nextSeq = 0;
  private lastHash = "00000000";
  private readonly listeners = new Set<(e: AuditEntry) => void>();

  constructor(capacity = 2000) {
    this.capacity = Math.max(1, capacity);
  }

  append(kind: AuditKind, ts: number, payload: Record<string, unknown>): AuditEntry {
    const seq = this.nextSeq++;
    const frozenPayload = Object.freeze({ ...payload });
    const body = `${seq}|${ts}|${kind}|${stableStringify(frozenPayload)}|${this.lastHash}`;
    const hash = fnv1a(body);
    const entry: AuditEntry = Object.freeze({
      seq,
      ts,
      kind,
      payload: frozenPayload,
      prevHash: this.lastHash,
      hash,
    });
    this.lastHash = hash;
    this.buf.push(entry);
    if (this.buf.length > this.capacity) this.buf.shift();
    for (const l of this.listeners) l(entry);
    return entry;
  }

  appendGateReport(ts: number, report: GateReport): AuditEntry {
    return this.append("GATE_REPORT", ts, {
      twinSeq: report.twinSeq,
      allPassed: report.allPassed,
      failedAt: report.failedAt,
      outcomes: report.outcomes.map((o) => ({
        gate: o.gate,
        passed: o.passed,
        specified: o.specified,
        reason: o.reason,
      })),
    });
  }

  tail(n = 50): AuditEntry[] {
    return this.buf.slice(-n);
  }

  head(): string {
    return this.lastHash;
  }

  onAppend(listener: (e: AuditEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.buf.length = 0;
    this.nextSeq = 0;
    this.lastHash = "00000000";
  }
}