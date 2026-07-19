import { BaseEngine } from "../base-engine";

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  ceo?: string;
  description?: string;
  website?: string;
}

export interface FinancialOverview {
  symbol: string;
  revenue?: number;
  earnings?: number;
  eps?: number;
  peRatio?: number;
  asOf?: number;
}

export interface CompanyIntelligenceProvider {
  readonly id: string;
  getProfile(symbol: string): Promise<CompanyProfile | null>;
  getFinancials(symbol: string): Promise<FinancialOverview | null>;
}

/**
 * Company Intelligence Engine
 *
 * Unified interface for company profile + financial overview lookups.
 * Returns null until a provider is registered.
 */
export class CompanyIntelligenceEngine extends BaseEngine {
  private provider: CompanyIntelligenceProvider | null = null;

  constructor() {
    super("company-intelligence");
  }

  registerProvider(provider: CompanyIntelligenceProvider) {
    this.provider = provider;
  }

  async getProfile(symbol: string): Promise<CompanyProfile | null> {
    return this.provider?.getProfile(symbol) ?? null;
  }

  async getFinancials(symbol: string): Promise<FinancialOverview | null> {
    return this.provider?.getFinancials(symbol) ?? null;
  }

  protected async onHealthCheck() {
    return { provider: this.provider?.id ?? null };
  }
}
