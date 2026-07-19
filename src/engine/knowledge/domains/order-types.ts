import type { KnowledgeDomain } from "../types";

export const orderTypes: KnowledgeDomain = {
  id: "order-types",
  title: "Order Types",
  summary: "Order semantics recognized by U.S. equity venues and major brokers.",
  entries: [
    {
      id: "market",
      domain: "order-types",
      category: "definition",
      title: "Market Order",
      summary: "Executes immediately at the best available price; no price protection.",
      tags: ["marketable"],
    },
    {
      id: "limit",
      domain: "order-types",
      category: "definition",
      title: "Limit Order",
      summary: "Executes only at the specified price or better; may not fill.",
      tags: ["price-protected"],
    },
    {
      id: "stop",
      domain: "order-types",
      category: "definition",
      title: "Stop (Stop-Loss) Order",
      summary: "Becomes a market order once a trigger price is touched.",
      tags: ["trigger", "risk"],
    },
    {
      id: "stop-limit",
      domain: "order-types",
      category: "definition",
      title: "Stop-Limit Order",
      summary:
        "Becomes a limit order once the stop is triggered; combines protection with the risk of no fill.",
      tags: ["trigger", "price-protected"],
    },
    {
      id: "trailing-stop",
      domain: "order-types",
      category: "definition",
      title: "Trailing Stop",
      summary:
        "Stop offset that follows favorable price movement while remaining fixed against adverse movement.",
      tags: ["trigger", "dynamic"],
    },
    {
      id: "bracket",
      domain: "order-types",
      category: "definition",
      title: "Bracket Order (OCO)",
      summary:
        "Entry plus paired take-profit and stop-loss orders; one cancels the other on fill.",
      tags: ["oco", "risk"],
    },
    {
      id: "tif",
      domain: "order-types",
      category: "taxonomy",
      title: "Time-In-Force",
      summary: "Instructions governing how long an order remains active.",
      data: {
        values: ["DAY", "GTC", "IOC", "FOK", "OPG", "CLS", "GTD"],
      },
      tags: ["tif"],
    },
    {
      id: "extended-hours-flag",
      domain: "order-types",
      category: "rule",
      title: "Extended-Hours Eligibility",
      summary:
        "Only limit orders with the extended-hours flag are accepted during pre-market and after-hours.",
      tags: ["session"],
    },
  ],
};
