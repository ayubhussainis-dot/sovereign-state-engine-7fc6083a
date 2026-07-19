import type { KnowledgeDomain } from "../types";

export const earningsAnalysis: KnowledgeDomain = {
  id: "earnings-analysis",
  title: "Earnings Analysis",
  summary: "How quarterly reports are structured, released, and interpreted.",
  entries: [
    {
      id: "release-windows",
      domain: "earnings-analysis",
      category: "taxonomy",
      title: "Release Windows",
      summary: "Before-market-open (BMO) or after-market-close (AMC) with a call typically 30-60 minutes later.",
      data: { values: ["BMO", "AMC", "DMH"] },
      tags: ["release"],
    },
    {
      id: "beats-misses",
      domain: "earnings-analysis",
      category: "concept",
      title: "Beats, Misses, and Surprise",
      summary: "Actual vs. consensus for EPS and revenue plus forward guidance drive post-earnings moves.",
      data: { fields: ["eps_actual", "eps_estimate", "rev_actual", "rev_estimate", "guidance"] },
      tags: ["surprise"],
    },
    {
      id: "expected-move",
      domain: "earnings-analysis",
      category: "formula",
      title: "Options-Implied Expected Move",
      summary: "One-standard-deviation move implied by front-week ATM straddle.",
      data: { formula: "expected_move ≈ 0.85 * (call_ATM + put_ATM)" },
      tags: ["options", "event"],
    },
    {
      id: "post-earnings-drift",
      domain: "earnings-analysis",
      category: "concept",
      title: "Post-Earnings Announcement Drift (PEAD)",
      summary:
        "Well-documented tendency for prices to continue moving in the direction of the earnings surprise.",
      tags: ["anomaly"],
    },
  ],
};
