import type { KnowledgeDomain } from "../types";

export const technicalAnalysis: KnowledgeDomain = {
  id: "technical-analysis",
  title: "Technical Analysis",
  summary:
    "The study of price and volume history to characterize trend, momentum, and structure.",
  entries: [
    {
      id: "trend",
      domain: "technical-analysis",
      category: "concept",
      title: "Trend",
      summary:
        "A directional bias defined by higher highs and higher lows (up) or lower highs and lower lows (down).",
      tags: ["trend", "structure"],
    },
    {
      id: "support-resistance",
      domain: "technical-analysis",
      category: "concept",
      title: "Support and Resistance",
      summary:
        "Price zones where prior order flow creates a higher probability of reaction.",
      tags: ["level"],
    },
    {
      id: "breakout",
      domain: "technical-analysis",
      category: "pattern",
      title: "Breakout",
      summary:
        "Price closes decisively beyond a defined range on expanding volume.",
      tags: ["momentum"],
    },
    {
      id: "pullback",
      domain: "technical-analysis",
      category: "pattern",
      title: "Pullback",
      summary:
        "A counter-trend retracement into prior structure inside an established trend.",
      tags: ["trend", "entry"],
    },
    {
      id: "multi-timeframe-alignment",
      domain: "technical-analysis",
      category: "workflow",
      title: "Multi-Timeframe Alignment",
      summary:
        "Confirming a signal on a lower timeframe against context from a higher timeframe.",
      tags: ["mtf", "workflow"],
    },
  ],
};
