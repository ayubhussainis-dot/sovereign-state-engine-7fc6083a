/**
 * Knowledge Foundation — Registry
 *
 * Central, read-only registry of every domain in the Knowledge Foundation.
 * Consumers should import from `@/engine` (via the KnowledgeEngine) rather
 * than reach into these files directly, but the registry itself is safe to
 * import for tests and offline tooling.
 */

import { candlestickAnalysis } from "./domains/candlestick-analysis";
import { chartPatterns } from "./domains/chart-patterns";
import { companyAnalysis } from "./domains/company-analysis";
import { earningsAnalysis } from "./domains/earnings-analysis";
import { economicIndicators } from "./domains/economic-indicators";
import { etf } from "./domains/etf";
import { fundamentalAnalysis } from "./domains/fundamental-analysis";
import { indicators } from "./domains/indicators";
import { liquidity } from "./domains/liquidity";
import { marketMicrostructure } from "./domains/market-microstructure";
import { marketStructure } from "./domains/market-structure";
import { marketTerminology } from "./domains/market-terminology";
import { orderTypes } from "./domains/order-types";
import { portfolioManagement } from "./domains/portfolio-management";
import { positionSizing } from "./domains/position-sizing";
import { priceAction } from "./domains/price-action";
import { professionalWorkflows } from "./domains/professional-workflows";
import { riskManagement } from "./domains/risk-management";
import { industryAnalysis, sectorAnalysis } from "./domains/sector-industry";
import { technicalAnalysis } from "./domains/technical-analysis";
import { tradingPsychology } from "./domains/trading-psychology";
import { volatility } from "./domains/volatility";
import { options } from "./domains/options";
import type { KnowledgeDomain } from "./types";

export const KNOWLEDGE_DOMAINS: readonly KnowledgeDomain[] = [
  marketStructure,
  marketMicrostructure,
  liquidity,
  volatility,
  orderTypes,
  technicalAnalysis,
  priceAction,
  candlestickAnalysis,
  indicators,
  chartPatterns,
  fundamentalAnalysis,
  companyAnalysis,
  sectorAnalysis,
  industryAnalysis,
  economicIndicators,
  earningsAnalysis,
  options,
  etf,
  portfolioManagement,
  riskManagement,
  positionSizing,
  tradingPsychology,
  marketTerminology,
  professionalWorkflows,
] as const;

export * from "./types";
