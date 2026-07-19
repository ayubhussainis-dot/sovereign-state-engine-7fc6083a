import type { KnowledgeDomain } from "../types";

export const companyAnalysis: KnowledgeDomain = {
  id: "company-analysis",
  title: "Company Analysis",
  summary: "Company-level framework covering business model, moat, and capital allocation.",
  entries: [
    {
      id: "business-model",
      domain: "company-analysis",
      category: "concept",
      title: "Business Model",
      summary: "How the company creates, delivers, and captures value; unit economics matter more than TAM.",
      tags: ["strategy"],
    },
    {
      id: "moat",
      domain: "company-analysis",
      category: "taxonomy",
      title: "Economic Moat",
      summary: "Durable competitive advantages that protect returns on capital.",
      data: {
        types: ["network-effects", "switching-costs", "intangible-assets", "cost-advantage", "efficient-scale"],
      },
      tags: ["competitive-advantage"],
    },
    {
      id: "management",
      domain: "company-analysis",
      category: "reference",
      title: "Management & Capital Allocation",
      summary: "Track record of reinvestment, M&A, buybacks, and dividends versus opportunity cost of capital.",
      tags: ["governance"],
    },
    {
      id: "guidance",
      domain: "company-analysis",
      category: "definition",
      title: "Company Guidance",
      summary: "Forward statements about revenue, margins, or EPS; sets the bar earnings are measured against.",
      tags: ["forward"],
    },
  ],
};
