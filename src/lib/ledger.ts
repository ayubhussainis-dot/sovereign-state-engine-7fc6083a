/**
 * Sovereign Ledger — append-only in-memory transactional log.
 * Immutable entries; no external I/O. A verified G2 checkpoint and
 * explicit Risk Authority validation are required before any trade
 * entry may be recorded.
 */

import type { SDTState } from "./SDTStateEngine";

export type LedgerEntry =
  | { kind: "STATE_TRANSITION"; from: SDTState; to: SDTState; ts: number }
  | { kind: "APOPTOSIS"; ts: number; reason: string }
  | {
      kind: "TRADE";
      ts: number;
      sMultiplier: number;
      g2Verified: true;
      riskAuthorityValidated: true;
    };

const entries: LedgerEntry[] = [];

export function appendLedger(entry: LedgerEntry): void {
  Object.freeze(entry);
  entries.push(entry);
}

export function readLedger(): ReadonlyArray<LedgerEntry> {
  return entries.slice();
}

export interface TradeAuthorization {
  g2Verified: boolean;
  riskAuthorityValidated: boolean;
  sMultiplier: number;
}

export function authorizeTrade(auth: TradeAuthorization): boolean {
  if (!auth.g2Verified || !auth.riskAuthorityValidated) return false;
  appendLedger({
    kind: "TRADE",
    ts: Date.now(),
    sMultiplier: auth.sMultiplier,
    g2Verified: true,
    riskAuthorityValidated: true,
  });
  return true;
}

/**
 * Brokerage connectivity placeholders. Real keys MUST be provided via
 * server-side environment variables and consumed only from a server
 * function boundary. These names are declarative only — never read
 * process.env on the client.
 */
export const BROKERAGE_ENV_KEYS = {
  IBKR: ["IBKR_ACCOUNT_ID", "IBKR_API_TOKEN"],
  ALPACA: ["ALPACA_API_KEY_ID", "ALPACA_SECRET_KEY"],
  TRADOVATE: ["TRADOVATE_USERNAME", "TRADOVATE_API_KEY"],
} as const;