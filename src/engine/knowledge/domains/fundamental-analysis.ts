import type { KnowledgeDomain } from "../types";

export const fundamentalAnalysis: KnowledgeDomain = {
  id: "fundamental-analysis",
  title: "Fundamental Analysis",
  summary: "Valuation frameworks and financial statement literacy for equities.",
  entries: [
    {
      id: "financial-statements",
      domain: "fundamental-analysis",
      category: "taxonomy",
      title: "Financial Statements",
      summary: "Income statement, balance sheet, and cash flow statement.",
      data: {
        incomeStatement: ["revenue", "gross_profit", "operating_income", "net_income", "eps"],
        balanceSheet: ["assets", "liabilities", "equity", "cash", "debt"],
        cashFlow: ["cfo", "cfi", "cff", "capex", "fcf"],
      },
      tags: ["statements"],
    },
    {
      id: "valuation-multiples",
      domain: "fundamental-analysis",
      category: "formula",
      title: "Common Valuation Multiples",
      summary: "Price- and enterprise-value-based ratios for cross-sectional comparison.",
      data: {
        multiples: ["P/E", "PEG", "P/S", "P/B", "EV/EBITDA", "EV/Sales", "FCF Yield"],
      },
      tags: ["valuation"],
    },
    {
      id: "dcf",
      domain: "fundamental-analysis",
      category: "formula",
      title: "Discounted Cash Flow (DCF)",
      summary: "Present value of projected free cash flows discounted at WACC plus a terminal value.",
      data: {
        formula: "V = sum(FCF_t / (1+WACC)^t) + TV / (1+WACC)^N",
      },
      tags: ["valuation"],
    },
    {
      id: "quality-metrics",
      domain: "fundamental-analysis",
      category: "reference",
      title: "Quality Metrics",
      summary: "Return on capital, margins, cash conversion, and leverage.",
      data: { metrics: ["ROE", "ROIC", "gross_margin", "op_margin", "net_margin", "debt_to_equity"] },
      tags: ["quality"],
    },
  ],
};
