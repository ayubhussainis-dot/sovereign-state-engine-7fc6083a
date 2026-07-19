import type { KnowledgeDomain } from "../types";

export const etf: KnowledgeDomain = {
  id: "etf",
  title: "ETF Knowledge",
  summary: "Structure, creation/redemption, and risks specific to exchange-traded funds.",
  entries: [
    {
      id: "creation-redemption",
      domain: "etf",
      category: "concept",
      title: "Creation / Redemption",
      summary:
        "Authorized Participants exchange baskets of underlying securities for ETF shares (and vice versa) to keep price near NAV.",
      tags: ["ap", "nav"],
    },
    {
      id: "nav-vs-price",
      domain: "etf",
      category: "definition",
      title: "NAV vs. Market Price",
      summary: "Premiums or discounts to NAV signal arbitrage friction, illiquidity, or stale pricing.",
      tags: ["nav", "premium"],
    },
    {
      id: "categories",
      domain: "etf",
      category: "taxonomy",
      title: "ETF Categories",
      summary: "Structural categories used for filtering and risk assessment.",
      data: {
        categories: [
          "broad-market",
          "sector",
          "industry",
          "thematic",
          "factor",
          "international",
          "fixed-income",
          "commodity",
          "currency",
          "leveraged",
          "inverse",
          "actively-managed",
        ],
      },
      tags: ["taxonomy"],
    },
    {
      id: "leveraged-decay",
      domain: "etf",
      category: "rule",
      title: "Leveraged ETF Decay",
      summary:
        "Daily-rebalanced leveraged and inverse ETFs suffer path-dependent decay in volatile, sideways markets.",
      tags: ["leverage", "decay"],
    },
  ],
};
