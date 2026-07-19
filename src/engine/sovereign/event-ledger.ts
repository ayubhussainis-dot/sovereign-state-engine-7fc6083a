/**
 * Sovereign Event Ledger — in-memory append-only ring buffer.
 *
 * HETIS has no ledger primitive; this adds one without introducing a
 * database dependency. Persistence to Supabase can be layered later by
 * subscribing to `onAppend`.
 */

import type { Phase } from "./genome";

export type SovereignEventType =
  | "PHASE_ENTERED"
  | "PHASE_REJECTED"
  | "JOKER_DETECTED"
  | "ACCUMULATION_TICK"
  | "LEVERAGE_CALCULATED"
  | "G2_CHECK"
  | "RISK_CHECK_PASSED"
  | "RISK_CHECK_FAILED"
  | "MITOSIS_EXECUTED"
  | "MITOSIS_BLOCKED"
  | "POSITION_CLOSED"
  | "Z_MODE_LOGGED"
  | "RISK_STATE_CHANGED"
  | "CONVERGENCE_7777"
  | "CIRCADIAN_TICK"
  | "FEED_STATUS"
  | "DECISION_MIRROR";

export interface LedgerEvent {
  id: string;
  type: SovereignEventType;
  phase: Phase;
  ts: number;
  payload?: Record<string, unknown>;
}

export interface EventLedger {
  append(event: Omit<LedgerEvent, "id" | "ts"> & { ts?: number }): LedgerEvent;
  tail(n?: number): LedgerEvent[];
  all(): LedgerEvent[];
  clear(): void;
  onAppend(listener: (event: LedgerEvent) => void): () => void;
}

export function createEventLedger(capacity = 400): EventLedger {
  const buf: LedgerEvent[] = [];
  const listeners = new Set<(e: LedgerEvent) => void>();
  let seq = 0;
  return {
    append(event) {
      const full: LedgerEvent = {
        id: `${Date.now().toString(36)}-${(seq++).toString(36)}`,
        ts: event.ts ?? Date.now(),
        type: event.type,
        phase: event.phase,
        payload: event.payload,
      };
      buf.push(full);
      if (buf.length > capacity) buf.shift();
      for (const l of listeners) l(full);
      return full;
    },
    tail(n = 50) {
      return buf.slice(-n);
    },
    all() {
      return [...buf];
    },
    clear() {
      buf.length = 0;
    },
    onAppend(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
