import type { KnowledgeDomain } from "../types";

export const marketMicrostructure: KnowledgeDomain = {
  id: "market-microstructure",
  title: "Market Microstructure",
  summary:
    "Mechanics of price formation at the order-book level: quotes, spreads, order flow, and execution quality.",
  entries: [
    {
      id: "nbbo",
      domain: "market-microstructure",
      category: "definition",
      title: "National Best Bid and Offer (NBBO)",
      summary:
        "The highest displayed bid and lowest displayed offer across all protected U.S. equity venues at a given moment.",
      tags: ["quote", "reg-nms"],
    },
    {
      id: "bid-ask-spread",
      domain: "market-microstructure",
      category: "formula",
      title: "Bid-Ask Spread",
      summary: "Ask minus bid; a first-order proxy for liquidity cost.",
      data: {
        formula: "spread = ask - bid",
        relative: "spread_bps = (ask - bid) / mid * 10000",
      },
      tags: ["liquidity", "cost"],
    },
    {
      id: "order-book-depth",
      domain: "market-microstructure",
      category: "concept",
      title: "Order Book Depth",
      summary:
        "Aggregate quantity resting at each price level; used to estimate slippage for a given size.",
      tags: ["book", "slippage"],
    },
    {
      id: "vwap-twap",
      domain: "market-microstructure",
      category: "formula",
      title: "VWAP and TWAP",
      summary:
        "Volume-Weighted and Time-Weighted Average Prices — session benchmarks and execution algorithms.",
      data: {
        vwap: "sum(price_i * volume_i) / sum(volume_i)",
        twap: "sum(price_i) / n",
      },
      tags: ["benchmark", "execution"],
    },
    {
      id: "market-impact",
      domain: "market-microstructure",
      category: "concept",
      title: "Market Impact",
      summary:
        "Adverse price movement caused by consuming liquidity; grows non-linearly with order size relative to ADV.",
      tags: ["execution", "cost"],
    },
    {
      id: "payment-for-order-flow",
      domain: "market-microstructure",
      category: "definition",
      title: "Payment for Order Flow (PFOF)",
      summary:
        "Compensation paid by wholesalers to brokers for routing retail orders; affects execution quality reporting under Rule 606.",
      tags: ["routing", "regulation"],
    },
  ],
};
