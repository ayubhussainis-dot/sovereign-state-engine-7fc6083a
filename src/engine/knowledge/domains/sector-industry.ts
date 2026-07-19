import type { KnowledgeDomain } from "../types";

export const sectorAnalysis: KnowledgeDomain = {
  id: "sector-analysis",
  title: "Sector Analysis",
  summary: "GICS sector taxonomy and cross-sector rotation dynamics.",
  entries: [
    {
      id: "gics-sectors",
      domain: "sector-analysis",
      category: "taxonomy",
      title: "GICS Sectors",
      summary: "The eleven top-level Global Industry Classification Standard sectors.",
      data: {
        sectors: [
          "Energy",
          "Materials",
          "Industrials",
          "Consumer Discretionary",
          "Consumer Staples",
          "Health Care",
          "Financials",
          "Information Technology",
          "Communication Services",
          "Utilities",
          "Real Estate",
        ],
      },
      tags: ["gics"],
    },
    {
      id: "sector-rotation",
      domain: "sector-analysis",
      category: "concept",
      title: "Sector Rotation",
      summary:
        "Capital moves between cyclical and defensive sectors as expectations for growth and rates change.",
      data: {
        cyclical: ["Consumer Discretionary", "Industrials", "Financials", "Materials", "Energy"],
        defensive: ["Consumer Staples", "Health Care", "Utilities"],
      },
      tags: ["rotation", "cycle"],
    },
  ],
};

export const industryAnalysis: KnowledgeDomain = {
  id: "industry-analysis",
  title: "Industry Analysis",
  summary: "GICS industry-group depth and structural frameworks.",
  entries: [
    {
      id: "gics-hierarchy",
      domain: "industry-analysis",
      category: "reference",
      title: "GICS Hierarchy",
      summary: "Sector → Industry Group → Industry → Sub-Industry (four levels).",
      tags: ["gics"],
    },
    {
      id: "porters-five-forces",
      domain: "industry-analysis",
      category: "concept",
      title: "Porter's Five Forces",
      summary:
        "Rivalry, new entrants, substitutes, supplier power, and buyer power shape industry attractiveness.",
      tags: ["framework"],
    },
    {
      id: "industry-lifecycle",
      domain: "industry-analysis",
      category: "concept",
      title: "Industry Life Cycle",
      summary: "Emergence, growth, maturity, and decline shape margin and multiple expectations.",
      tags: ["lifecycle"],
    },
  ],
};
