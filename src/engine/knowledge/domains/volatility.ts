import type { KnowledgeDomain } from "../types";

export const volatility: KnowledgeDomain = {
  id: "volatility",
  title: "Volatility",
  summary: "Measures of price dispersion used for risk sizing, regime detection, and options pricing.",
  entries: [
    {
      id: "historical-volatility",
      domain: "volatility",
      category: "formula",
      title: "Historical (Realized) Volatility",
      summary: "Annualized standard deviation of log returns.",
      data: {
        formula: "HV = stdev(ln(P_t/P_{t-1})) * sqrt(252)",
      },
      tags: ["realized", "annualized"],
    },
    {
      id: "atr",
      domain: "volatility",
      category: "indicator",
      title: "Average True Range (ATR)",
      summary:
        "Wilder's smoothing of True Range; used for stop placement and position sizing.",
      data: {
        trueRange: "max(high-low, |high-prevClose|, |low-prevClose|)",
        default: 14,
      },
      tags: ["atr", "wilder", "stops"],
    },
    {
      id: "iv",
      domain: "volatility",
      category: "definition",
      title: "Implied Volatility (IV)",
      summary:
        "Forward-looking volatility implied by option prices via an option-pricing model.",
      tags: ["options", "forward"],
    },
    {
      id: "iv-rank-percentile",
      domain: "volatility",
      category: "formula",
      title: "IV Rank and IV Percentile",
      summary:
        "Where current IV sits inside its 52-week range (rank) or distribution (percentile).",
      data: {
        ivRank: "(IV - IV_min_52w) / (IV_max_52w - IV_min_52w)",
        ivPercentile: "share of days with IV below current in last 252 sessions",
      },
      tags: ["options", "regime"],
    },
    {
      id: "vix",
      domain: "volatility",
      category: "reference",
      title: "VIX — CBOE Volatility Index",
      summary:
        "30-day expected volatility of the S&P 500 derived from SPX option prices.",
      tags: ["vix", "spx", "regime"],
    },
  ],
};
