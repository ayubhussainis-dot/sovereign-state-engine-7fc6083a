import type { KnowledgeDomain } from "../types";

export const options: KnowledgeDomain = {
  id: "options",
  title: "Options",
  summary: "Contract mechanics, Greeks, and structural knowledge for U.S. equity options.",
  entries: [
    {
      id: "contract-basics",
      domain: "options",
      category: "definition",
      title: "Contract Basics",
      summary: "One equity option contract represents 100 shares; American-style exercise is standard.",
      tags: ["contract"],
    },
    {
      id: "greeks",
      domain: "options",
      category: "reference",
      title: "The Greeks",
      summary: "Delta, gamma, theta, vega, and rho describe first- and second-order sensitivities.",
      data: {
        delta: "d Price / d Underlying",
        gamma: "d Delta / d Underlying",
        theta: "d Price / d Time",
        vega: "d Price / d IV",
        rho: "d Price / d Rate",
      },
      tags: ["greeks"],
    },
    {
      id: "moneyness",
      domain: "options",
      category: "definition",
      title: "Moneyness",
      summary: "ITM, ATM, and OTM relative to strike and spot.",
      tags: ["strike"],
    },
    {
      id: "assignment-exercise",
      domain: "options",
      category: "rule",
      title: "Assignment & Exercise",
      summary:
        "Short options may be assigned at any time before expiration; ITM options at expiry are auto-exercised at OCC threshold.",
      tags: ["assignment"],
    },
    {
      id: "strategies",
      domain: "options",
      category: "taxonomy",
      title: "Core Strategies",
      summary: "Foundational multi-leg structures.",
      data: {
        strategies: [
          "long-call",
          "long-put",
          "covered-call",
          "cash-secured-put",
          "vertical-spread",
          "iron-condor",
          "calendar",
          "diagonal",
          "straddle",
          "strangle",
        ],
      },
      tags: ["strategy"],
    },
    {
      id: "0dte",
      domain: "options",
      category: "concept",
      title: "0DTE / Weeklies",
      summary:
        "Same-day and weekly expirations concentrate gamma and can materially affect intraday index behavior.",
      tags: ["gamma", "weekly"],
    },
  ],
};
