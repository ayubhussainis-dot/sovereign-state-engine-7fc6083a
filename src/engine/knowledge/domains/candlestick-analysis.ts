import type { KnowledgeDomain } from "../types";

export const candlestickAnalysis: KnowledgeDomain = {
  id: "candlestick-analysis",
  title: "Candlestick Analysis",
  summary: "Japanese candlestick anatomy and canonical single/multi-bar patterns.",
  entries: [
    {
      id: "anatomy",
      domain: "candlestick-analysis",
      category: "reference",
      title: "Candle Anatomy",
      summary: "Open, high, low, close plus body and upper/lower wicks.",
      data: { fields: ["open", "high", "low", "close", "volume"] },
      tags: ["ohlc"],
    },
    {
      id: "doji",
      domain: "candlestick-analysis",
      category: "pattern",
      title: "Doji",
      summary: "Open ≈ close; indecision, especially meaningful at extremes.",
      tags: ["indecision"],
    },
    {
      id: "hammer-shooting-star",
      domain: "candlestick-analysis",
      category: "pattern",
      title: "Hammer / Shooting Star",
      summary: "Long-wick rejection candles at swing lows/highs.",
      tags: ["reversal"],
    },
    {
      id: "engulfing",
      domain: "candlestick-analysis",
      category: "pattern",
      title: "Bullish / Bearish Engulfing",
      summary:
        "A body that fully covers the previous body, signaling a possible short-term reversal.",
      tags: ["reversal", "two-bar"],
    },
    {
      id: "inside-outside-bar",
      domain: "candlestick-analysis",
      category: "pattern",
      title: "Inside / Outside Bar",
      summary:
        "Compression (inside) or expansion (outside) relative to the prior bar's range.",
      tags: ["volatility"],
    },
    {
      id: "morning-evening-star",
      domain: "candlestick-analysis",
      category: "pattern",
      title: "Morning Star / Evening Star",
      summary: "Three-bar reversal patterns with a gap and body confirmation.",
      tags: ["reversal", "three-bar"],
    },
  ],
};
