import type { KnowledgeDomain } from "../types";

export const marketStructure: KnowledgeDomain = {
  id: "market-structure",
  title: "Market Structure",
  summary:
    "How U.S. equity markets are organized: venues, sessions, participants, and the lifecycle of a tradable instrument.",
  entries: [
    {
      id: "us-equity-sessions",
      domain: "market-structure",
      category: "reference",
      title: "U.S. Equity Trading Sessions",
      summary:
        "Regular, pre-market, and after-hours windows for NYSE/NASDAQ listed securities in America/New_York time.",
      data: {
        timezone: "America/New_York",
        sessions: [
          { id: "pre-market", start: "04:00", end: "09:30" },
          { id: "regular", start: "09:30", end: "16:00" },
          { id: "after-hours", start: "16:00", end: "20:00" },
        ],
        auctions: [
          { id: "opening-cross", venue: "NASDAQ", at: "09:30" },
          { id: "closing-cross", venue: "NASDAQ", at: "16:00" },
          { id: "opening-auction", venue: "NYSE", at: "09:30" },
          { id: "closing-auction", venue: "NYSE", at: "16:00" },
        ],
      },
      tags: ["session", "hours", "auction"],
    },
    {
      id: "venues",
      domain: "market-structure",
      category: "taxonomy",
      title: "Execution Venues",
      summary:
        "Lit exchanges, ATSs (dark pools), single-dealer platforms, and wholesalers used to route U.S. equity orders.",
      data: {
        lit: ["NYSE", "NASDAQ", "ARCA", "BATS", "IEX", "MEMX", "MIAX"],
        dark: ["UBS ATS", "CrossFinder", "Sigma X", "MS Pool"],
        wholesalers: ["Citadel Securities", "Virtu", "G1X", "Two Sigma"],
      },
      tags: ["venue", "routing"],
    },
    {
      id: "reg-nms",
      domain: "market-structure",
      category: "rule",
      title: "Regulation NMS — Order Protection",
      summary:
        "Rule 611 requires trading centers to prevent trade-throughs of protected quotations, establishing the NBBO as the reference price.",
      tags: ["regulation", "nbbo"],
    },
    {
      id: "circuit-breakers",
      domain: "market-structure",
      category: "rule",
      title: "Market-Wide Circuit Breakers",
      summary:
        "Halt levels tied to S&P 500 declines from the prior close: Level 1 -7%, Level 2 -13%, Level 3 -20%.",
      data: {
        levels: [
          { id: "L1", drop: -0.07, action: "15-minute halt before 15:25 ET" },
          { id: "L2", drop: -0.13, action: "15-minute halt before 15:25 ET" },
          { id: "L3", drop: -0.2, action: "trading halted for the day" },
        ],
      },
      tags: ["halt", "risk"],
    },
    {
      id: "lulds",
      domain: "market-structure",
      category: "rule",
      title: "Limit Up-Limit Down (LULD)",
      summary:
        "Price bands that pause trading in individual securities when quotes move outside a percentage of a reference price.",
      tags: ["halt", "single-stock"],
    },
  ],
};
