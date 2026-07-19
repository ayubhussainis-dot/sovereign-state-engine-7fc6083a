import type { KnowledgeDomain } from "../types";

export const marketTerminology: KnowledgeDomain = {
  id: "market-terminology",
  title: "Market Terminology",
  summary: "Compact glossary of terms used across the operating system.",
  entries: [
    {
      id: "glossary",
      domain: "market-terminology",
      category: "reference",
      title: "Core Glossary",
      summary: "Key terms consumers can reference by short-name.",
      data: {
        terms: {
          bid: "highest price a buyer is willing to pay",
          ask: "lowest price a seller will accept",
          mid: "(bid + ask) / 2",
          spread: "ask - bid",
          slippage: "difference between expected and executed price",
          liquidity: "ability to trade size without moving price",
          volatility: "dispersion of returns",
          drawdown: "decline from a peak in equity",
          hedge: "position that offsets an existing exposure",
          leverage: "exposure exceeding deployed capital",
          margin: "collateral required to hold a leveraged position",
          short: "sale of borrowed stock aiming to buy back lower",
          cover: "buy-to-close a short position",
          halt: "trading suspension by exchange or regulator",
          tick: "smallest allowed price increment",
          lot: "standard trading unit (100 shares for U.S. equities)",
        },
      },
      tags: ["glossary"],
    },
  ],
};
