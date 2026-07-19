import type { KnowledgeDomain } from "../types";

export const priceAction: KnowledgeDomain = {
  id: "price-action",
  title: "Price Action",
  summary: "Reading raw price without indicators: swings, ranges, and rejection.",
  entries: [
    {
      id: "swing-high-low",
      domain: "price-action",
      category: "definition",
      title: "Swing High / Swing Low",
      summary:
        "A local extreme where price reverses; forms the skeleton of trend and structure.",
      tags: ["swing"],
    },
    {
      id: "market-structure-shift",
      domain: "price-action",
      category: "concept",
      title: "Market Structure Shift",
      summary:
        "A break of the most recent higher-low (in an uptrend) or lower-high (in a downtrend) signaling a possible regime change.",
      tags: ["structure", "reversal"],
    },
    {
      id: "liquidity-sweep",
      domain: "price-action",
      category: "pattern",
      title: "Liquidity Sweep (Stop Run)",
      summary:
        "Price briefly pierces a well-known swing to trigger resting stops before reversing.",
      tags: ["stops", "manipulation"],
    },
    {
      id: "range",
      domain: "price-action",
      category: "concept",
      title: "Range / Consolidation",
      summary:
        "Sideways price action between defined boundaries, indicating balance between buyers and sellers.",
      tags: ["balance"],
    },
    {
      id: "gap",
      domain: "price-action",
      category: "taxonomy",
      title: "Gaps",
      summary: "Discontinuities between one bar's close and the next bar's open.",
      data: {
        types: ["common", "breakaway", "runaway", "exhaustion"],
      },
      tags: ["gap"],
    },
  ],
};
