import type { KnowledgeDomain } from "../types";

export const liquidity: KnowledgeDomain = {
  id: "liquidity",
  title: "Liquidity",
  summary: "How easily an instrument can be traded at or near its quoted price.",
  entries: [
    {
      id: "adv",
      domain: "liquidity",
      category: "formula",
      title: "Average Daily Volume (ADV)",
      summary: "Mean daily share volume over a lookback window (commonly 20 or 30 sessions).",
      data: { formula: "ADV_n = mean(volume_{t-n..t})" },
      tags: ["volume"],
    },
    {
      id: "dollar-volume",
      domain: "liquidity",
      category: "formula",
      title: "Dollar Volume",
      summary: "Volume weighted by price; a size-agnostic liquidity measure.",
      data: { formula: "$vol = price * volume" },
      tags: ["volume", "size"],
    },
    {
      id: "turnover",
      domain: "liquidity",
      category: "formula",
      title: "Turnover Ratio",
      summary: "Traded shares divided by float; how many times the float rotates in a period.",
      data: { formula: "turnover = volume / float" },
      tags: ["float", "rotation"],
    },
    {
      id: "amihud-illiquidity",
      domain: "liquidity",
      category: "formula",
      title: "Amihud Illiquidity",
      summary: "Absolute return per unit of dollar volume; higher = less liquid.",
      data: { formula: "ILLIQ = |r_t| / $vol_t" },
      tags: ["illiquidity", "impact"],
    },
    {
      id: "float-vs-shares-outstanding",
      domain: "liquidity",
      category: "definition",
      title: "Float vs. Shares Outstanding",
      summary:
        "Float excludes locked-up insider and restricted shares; low float amplifies volatility.",
      tags: ["float", "supply"],
    },
  ],
};
