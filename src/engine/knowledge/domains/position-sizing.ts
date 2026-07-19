import type { KnowledgeDomain } from "../types";

export const positionSizing: KnowledgeDomain = {
  id: "position-sizing",
  title: "Position Sizing",
  summary: "Deterministic rules converting risk budget into share quantity.",
  entries: [
    {
      id: "fixed-fractional",
      domain: "position-sizing",
      category: "formula",
      title: "Fixed Fractional",
      summary: "Risk a constant fraction of equity per trade.",
      data: {
        formula: "shares = (equity * risk_pct) / (entry - stop)",
      },
      tags: ["sizing", "stop"],
    },
    {
      id: "atr-based",
      domain: "position-sizing",
      category: "formula",
      title: "ATR-Based Sizing",
      summary: "Size so that N ATRs of adverse movement equals the risk budget.",
      data: {
        formula: "shares = (equity * risk_pct) / (N * ATR)",
      },
      tags: ["atr", "volatility"],
    },
    {
      id: "vol-target",
      domain: "position-sizing",
      category: "formula",
      title: "Volatility Targeting",
      summary: "Scale exposure inversely to realized volatility to hold portfolio vol constant.",
      data: { formula: "weight_i = target_vol / vol_i" },
      tags: ["vol-target"],
    },
    {
      id: "kelly",
      domain: "position-sizing",
      category: "formula",
      title: "Kelly Criterion",
      summary: "Growth-optimal fraction; discretionary traders typically apply a fractional Kelly.",
      data: { formula: "f* = (bp - q) / b" },
      tags: ["kelly"],
    },
    {
      id: "max-position",
      domain: "position-sizing",
      category: "rule",
      title: "Maximum Position Weight",
      summary: "Cap on any single position (commonly 5%-10% of equity for discretionary books).",
      tags: ["concentration"],
    },
  ],
};
