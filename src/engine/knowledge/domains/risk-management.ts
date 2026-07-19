import type { KnowledgeDomain } from "../types";

export const riskManagement: KnowledgeDomain = {
  id: "risk-management",
  title: "Risk Management",
  summary: "Non-negotiable rules governing loss limits and portfolio exposure.",
  entries: [
    {
      id: "risk-per-trade",
      domain: "risk-management",
      category: "rule",
      title: "Risk Per Trade",
      summary:
        "Typical discretionary ceiling of 0.25%-1.0% of account equity risked per single trade.",
      tags: ["ceiling"],
    },
    {
      id: "daily-loss-limit",
      domain: "risk-management",
      category: "rule",
      title: "Daily Loss Limit",
      summary: "Hard stop on trading for the session once cumulative loss threshold is hit.",
      tags: ["circuit"],
    },
    {
      id: "max-drawdown",
      domain: "risk-management",
      category: "formula",
      title: "Maximum Drawdown",
      summary: "Peak-to-trough decline in equity; a primary tolerance and sizing input.",
      data: { formula: "MDD = min((equity_t - peak_t) / peak_t)" },
      tags: ["drawdown"],
    },
    {
      id: "var",
      domain: "risk-management",
      category: "formula",
      title: "Value at Risk (VaR)",
      summary: "Loss threshold not expected to be exceeded at a given confidence over a horizon.",
      tags: ["var"],
    },
    {
      id: "correlation-risk",
      domain: "risk-management",
      category: "concept",
      title: "Correlation Risk",
      summary:
        "Positions with high pairwise correlation multiply exposure to the same factor even when tickers differ.",
      tags: ["correlation", "factor"],
    },
    {
      id: "event-risk",
      domain: "risk-management",
      category: "workflow",
      title: "Event Risk Management",
      summary:
        "Reduce or hedge exposure ahead of scheduled catalysts (earnings, FOMC, CPI) when the payoff is not the goal.",
      tags: ["event"],
    },
  ],
};
