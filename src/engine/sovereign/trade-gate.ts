/**
 * Sovereign Trade Gate — the exposed "do-not-trade" firewall.
 *
 * Composes existing signals (dual-core agreement, confidence floor, feed
 * freshness, drawdown/risk authority) into a single hard decision.
 * If any check fails, the trade is refused with an explicit reason that
 * lands in the ledger and the UI.
 */

import type { AuthorityReading } from "./risk-authority";
import type { SovereignGate } from "./gating";

export interface TradeGateInputs {
  dualCoreAgreed: boolean;
  dualCoreReason: string;
  confidence: number;
  minConfidence?: number;
  /** ms since the last feed tick; null = unknown. */
  feedAgeMs: number | null;
  maxFeedAgeMs?: number;
  crossFeedDivergencePct: number | null;
  maxCrossFeedDivergencePct?: number;
  authority: AuthorityReading;
  gate: SovereignGate;
}

export interface TradeGateVerdict {
  allow: boolean;
  reason: string;
  checks: {
    dualCore: boolean;
    confidence: boolean;
    feedFresh: boolean;
    crossFeed: boolean;
    authority: boolean;
    riskGate: boolean;
  };
}

export function evaluateTradeGate(input: TradeGateInputs): TradeGateVerdict {
  const minConf = input.minConfidence ?? 0.55;
  const maxAge = input.maxFeedAgeMs ?? 5_000;
  const maxDiv = input.maxCrossFeedDivergencePct ?? 0.15;

  const dualCore = input.dualCoreAgreed;
  const confidence = input.confidence >= minConf;
  const feedFresh = input.feedAgeMs === null ? true : input.feedAgeMs <= maxAge;
  const crossFeed =
    input.crossFeedDivergencePct === null
      ? true
      : Math.abs(input.crossFeedDivergencePct) <= maxDiv;
  const authority = input.authority.state !== "HALTED";
  const riskGate = input.gate.permit;

  const reasons: string[] = [];
  if (!dualCore) reasons.push(input.dualCoreReason || "dual-core disagreement");
  if (!confidence) reasons.push(`confidence ${input.confidence.toFixed(2)} < ${minConf}`);
  if (!feedFresh) reasons.push(`feed stale ${input.feedAgeMs}ms > ${maxAge}ms`);
  if (!crossFeed)
    reasons.push(
      `cross-feed divergence ${input.crossFeedDivergencePct?.toFixed(3)}% > ${maxDiv}%`,
    );
  if (!authority) reasons.push(`authority ${input.authority.state}`);
  if (!riskGate) reasons.push(`risk gate: ${input.gate.reason}`);

  const allow =
    dualCore && confidence && feedFresh && crossFeed && authority && riskGate;

  return {
    allow,
    reason: allow ? "all checks passed" : reasons.join(" · "),
    checks: { dualCore, confidence, feedFresh, crossFeed, authority, riskGate },
  };
}
