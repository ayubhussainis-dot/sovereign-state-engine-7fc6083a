import type { KnowledgeDomain } from "../types";

export const portfolioManagement: KnowledgeDomain = {
  id: "portfolio-management",
  title: "Portfolio Management",
  summary: "Constructing and maintaining a portfolio: allocation, diversification, and performance.",
  entries: [
    {
      id: "allocation",
      domain: "portfolio-management",
      category: "concept",
      title: "Asset Allocation",
      summary: "Top-down split of capital across asset classes drives most of long-run variance.",
      tags: ["allocation"],
    },
    {
      id: "diversification",
      domain: "portfolio-management",
      category: "concept",
      title: "Diversification",
      summary: "Non-perfectly-correlated holdings reduce portfolio variance without proportional return loss.",
      tags: ["correlation"],
    },
    {
      id: "rebalancing",
      domain: "portfolio-management",
      category: "workflow",
      title: "Rebalancing",
      summary: "Calendar- or threshold-based restoration of target weights.",
      tags: ["maintenance"],
    },
    {
      id: "performance-metrics",
      domain: "portfolio-management",
      category: "reference",
      title: "Performance Metrics",
      summary: "Risk-adjusted return metrics for evaluating strategies.",
      data: {
        metrics: [
          "cagr",
          "volatility",
          "sharpe",
          "sortino",
          "calmar",
          "max_drawdown",
          "beta",
          "alpha",
          "information_ratio",
        ],
      },
      tags: ["metrics"],
    },
  ],
};
