// ============================================================
// N.O.T · TWO-WAY MIRROR + FUSION  (ported from Sovereign Engine)
// Same market. Two different lenses. One consensus surface.
//
//   NOT-lens  →  BOOK view   (bid/ask pressure, spread)
//   TON-lens  →  FLOW view   (taker imbalance, trade velocity)
//
// Consensus = signal BOTH lenses agree on   (A ∩ B)
// Residual  = signal only ONE lens saw      (A △ B)  ← the womb
// This module derives; it does not decide. No trading logic.
// ============================================================

import { useEffect, useState } from "react";
import { binanceMirror, type MirrorFrame } from "./not-mirror";

export type LensReading = {
  bullish: number;
  bearish: number;
  tension: number;
  confidence: number;
  axis: number;
};

export type Fusion = {
  not: LensReading;
  ton: LensReading;
  consensusBull: number;
  consensusBear: number;
  agreement: number;
  residual: number;
  residualOwner: "NOT" | "TON" | "NONE";
  verdict: "LOCKED-BULL" | "LOCKED-BEAR" | "SPLIT" | "SILENT";
};

export function readNOT(f: MirrorFrame): LensReading {
  const bidP = f.bidPressure / 100;
  const askP = f.askPressure / 100;
  const spreadTight = Math.max(0, 1 - f.spreadBps / 3);
  const axis = bidP - askP;
  return {
    bullish: Math.max(0, axis),
    bearish: Math.max(0, -axis),
    tension: 1 - Math.abs(axis),
    confidence: f.connected ? spreadTight : 0,
    axis: axis * 10_000,
  };
}

export function readTON(f: MirrorFrame): LensReading {
  // Real directional magnitude: signed taker flow normalised by its own
  // magnitude scale. Falls back to the legacy 0..160 encoding if absent.
  const flowNorm =
    typeof f.flowImbalance === "number" && f.flowScale > 0
      ? Math.max(-1, Math.min(1, f.flowImbalance))
      : (f.orderFlow - 80) / 80;
  const vel = Math.min(1, f.velocityBps / 8);
  const kinetic = Math.sign(flowNorm) * vel;
  const axis = Math.max(-1, Math.min(1, flowNorm * 0.5 + kinetic * 0.5));
  const freshness = f.lastTradeAt
    ? Math.max(0, 1 - (Date.now() - f.lastTradeAt) / 4000)
    : 0;
  return {
    bullish: Math.max(0, axis),
    bearish: Math.max(0, -axis),
    tension: 1 - Math.abs(axis),
    confidence: f.connected ? freshness : 0,
    axis: axis * 100,
  };
}

export function fuse(not: LensReading, ton: LensReading): Fusion {
  const w = Math.sqrt(not.confidence * ton.confidence);
  const consensusBull = Math.min(not.bullish, ton.bullish) * w;
  const consensusBear = Math.min(not.bearish, ton.bearish) * w;
  const aN = not.bullish - not.bearish;
  const aT = ton.bullish - ton.bearish;
  const agreement = 1 - Math.min(1, Math.abs(aN - aT) / 2);
  const resBull = Math.abs(not.bullish - ton.bullish);
  const resBear = Math.abs(not.bearish - ton.bearish);
  const residual = Math.max(resBull, resBear);
  const residualOwner: Fusion["residualOwner"] =
    residual < 0.05
      ? "NONE"
      : (not.bullish + not.bearish) > (ton.bullish + ton.bearish)
        ? "NOT"
        : "TON";

  let verdict: Fusion["verdict"] = "SILENT";
  if (w < 0.05) verdict = "SILENT";
  else if (agreement > 0.7 && consensusBull > consensusBear + 0.05) verdict = "LOCKED-BULL";
  else if (agreement > 0.7 && consensusBear > consensusBull + 0.05) verdict = "LOCKED-BEAR";
  else verdict = "SPLIT";

  return { not, ton, consensusBull, consensusBear, agreement, residual, residualOwner, verdict };
}

/** Names the single term that prevented a LOCKED verdict. Pure. */
export function fusionBlocker(f: Fusion): string | null {
  if (f.verdict === "LOCKED-BULL" || f.verdict === "LOCKED-BEAR") return null;
  const w = Math.sqrt(f.not.confidence * f.ton.confidence);
  if (w < 0.05) {
    return f.not.confidence <= f.ton.confidence
      ? "NOT_CONFIDENCE_LOW"
      : "TON_CONFIDENCE_LOW";
  }
  if (f.agreement <= 0.7) return "AGREEMENT_BELOW_0.70";
  if (Math.abs(f.consensusBull - f.consensusBear) <= 0.05) {
    return "CONSENSUS_MARGIN_BELOW_0.05";
  }
  return "UNSPECIFIED_SPLIT";
}

export function useFusion(intervalMs = 200): { fusion: Fusion; frame: MirrorFrame } {
  const [state, setState] = useState(() => {
    const f = binanceMirror.current;
    return { fusion: fuse(readNOT(f), readTON(f)), frame: f };
  });
  useEffect(() => {
    const id = setInterval(() => {
      const f = binanceMirror.current;
      setState({ fusion: fuse(readNOT(f), readTON(f)), frame: f });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return state;
}