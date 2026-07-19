import type { KnowledgeDomain } from "../types";

export const tradingPsychology: KnowledgeDomain = {
  id: "trading-psychology",
  title: "Trading Psychology",
  summary: "Cognitive and behavioral biases that degrade trading decisions, and the routines that counter them.",
  entries: [
    {
      id: "loss-aversion",
      domain: "trading-psychology",
      category: "concept",
      title: "Loss Aversion",
      summary: "Losses are felt roughly twice as strongly as equivalent gains, distorting risk decisions.",
      tags: ["bias"],
    },
    {
      id: "confirmation-bias",
      domain: "trading-psychology",
      category: "concept",
      title: "Confirmation Bias",
      summary: "Over-weighting evidence that supports a held position.",
      tags: ["bias"],
    },
    {
      id: "recency-bias",
      domain: "trading-psychology",
      category: "concept",
      title: "Recency Bias",
      summary: "Latest outcomes weigh more heavily than base rates.",
      tags: ["bias"],
    },
    {
      id: "overtrading",
      domain: "trading-psychology",
      category: "concept",
      title: "Overtrading",
      summary: "Increasing frequency to force PnL; usually raises variance without raising edge.",
      tags: ["behavior"],
    },
    {
      id: "tilt",
      domain: "trading-psychology",
      category: "concept",
      title: "Tilt",
      summary: "Emotionally driven decisions after a loss or drawdown, typically violating the plan.",
      tags: ["behavior"],
    },
    {
      id: "journal",
      domain: "trading-psychology",
      category: "workflow",
      title: "Trade Journal",
      summary: "Structured pre- and post-trade notes convert experience into data.",
      tags: ["review"],
    },
  ],
};
