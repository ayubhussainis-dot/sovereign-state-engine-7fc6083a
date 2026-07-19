import type { KnowledgeDomain } from "../types";

export const professionalWorkflows: KnowledgeDomain = {
  id: "professional-workflows",
  title: "Professional Trading Workflows",
  summary: "The daily loop institutional and professional discretionary traders run.",
  entries: [
    {
      id: "pre-market-prep",
      domain: "professional-workflows",
      category: "workflow",
      title: "Pre-Market Preparation",
      summary: "Review overnight moves, futures, macro calendar, earnings docket, and watchlist levels before the open.",
      data: {
        steps: [
          "review overnight futures and rates",
          "scan macro calendar for scheduled events",
          "read earnings and news for held names",
          "mark levels on watchlist charts",
          "define risk budget for the session",
        ],
      },
      tags: ["pre-market"],
    },
    {
      id: "opening-hour",
      domain: "professional-workflows",
      category: "workflow",
      title: "Opening-Hour Playbook",
      summary:
        "Handle the first 30-60 minutes with awareness of imbalance, opening range, and heightened volatility.",
      tags: ["open"],
    },
    {
      id: "midday-management",
      domain: "professional-workflows",
      category: "workflow",
      title: "Midday Management",
      summary: "Lower activity window; manage risk on existing positions, avoid initiating in thin tape.",
      tags: ["midday"],
    },
    {
      id: "close-and-moc",
      domain: "professional-workflows",
      category: "workflow",
      title: "Close and MOC/LOC Handling",
      summary:
        "Assess closing imbalance data (typically published from 15:50 ET) and route MOC/LOC per venue rules.",
      tags: ["close", "auction"],
    },
    {
      id: "post-market-review",
      domain: "professional-workflows",
      category: "workflow",
      title: "Post-Market Review",
      summary:
        "Reconcile fills, tag trades in the journal, measure execution vs. plan, and prep tomorrow's watchlist.",
      tags: ["review"],
    },
    {
      id: "weekly-review",
      domain: "professional-workflows",
      category: "workflow",
      title: "Weekly Review",
      summary:
        "Aggregate metrics by setup, symbol, and time-of-day to find edges and leaks.",
      tags: ["review"],
    },
  ],
};
