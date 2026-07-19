import { createEngineBus } from "./bus";
import { createEngineLogger } from "./logger";
import { AlertEngine } from "./modules/alert-engine";
import { BacktestingEngine } from "./modules/backtesting-engine";
import { BootEngine } from "./modules/boot-engine";
import { BrokerEngine } from "./modules/broker-engine";
import { CandidateGenerationEngine } from "./modules/candidate-generation-engine";
import { CandlestickEngine } from "./modules/candlestick-engine";
import { ChartEngine } from "./modules/chart-engine";
import { ChartPatternEngine } from "./modules/chart-pattern-engine";
import { CompanyIntelligenceEngine } from "./modules/company-intelligence-engine";
import { ConfidenceEngine } from "./modules/confidence-engine";
import { ConfluenceScannerEngine } from "./modules/confluence-scanner-engine";
import { DecisionEngine } from "./modules/decision-engine";
import { EarningsCalendarEngine } from "./modules/earnings-calendar-engine";
import { EconomicCalendarEngine } from "./modules/economic-calendar-engine";
import { FairValueGapEngine } from "./modules/fair-value-gap-engine";
import { FibonacciEngine } from "./modules/fibonacci-engine";
import { HeatMapEngine } from "./modules/heat-map-engine";
import { ICTMacroEngine } from "./modules/ict-macro-engine";
import { KnowledgeEngine } from "./modules/knowledge-engine";
import { LiquidityEngine } from "./modules/liquidity-engine";
import { LiveMarketEngine } from "./modules/live-market-engine";
import { MTFConfluenceEngine } from "./modules/mtf-confluence-engine";
import { MarketDataEngine } from "./modules/market-data-engine";
import { MarketStructureEngine } from "./modules/market-structure-engine";
import { MarketOrganizationEngine } from "./modules/market-organization-engine";
import { MarketReadingEngine } from "./modules/market-reading-engine";
import { MarketRealizationEngine } from "./modules/market-realization-engine";
import { MarketScannerEngine } from "./modules/market-scanner-engine";
import { NewsEngine } from "./modules/news-engine";
import { OrderBlockEngine } from "./modules/order-block-engine";
import { PortfolioEngine } from "./modules/portfolio-engine";
import { PsychologyEngine } from "./modules/psychology-engine";
import { RiskEngine } from "./modules/risk-engine";
import { SessionEngine } from "./modules/session-engine";
import { SystemHealthEngine } from "./modules/system-health-engine";
import { TradeJournalEngine } from "./modules/trade-journal-engine";
import { VaultEngine } from "./modules/vault-engine";
import { WatchlistEngine } from "./modules/watchlist-engine";
import type { Engine, EngineBus, EngineContext, EngineHealth } from "./types";

export interface Kernel {
  bus: EngineBus;
  boot: BootEngine;
  health: SystemHealthEngine;
  reading: MarketReadingEngine;
  organization: MarketOrganizationEngine;
  realization: MarketRealizationEngine;
  candidates: CandidateGenerationEngine;
  marketData: MarketDataEngine;
  chart: ChartEngine;
  scanner: MarketScannerEngine;
  heatMap: HeatMapEngine;
  company: CompanyIntelligenceEngine;
  watchlist: WatchlistEngine;
  news: NewsEngine;
  economicCalendar: EconomicCalendarEngine;
  earningsCalendar: EarningsCalendarEngine;
  alerts: AlertEngine;
  portfolio: PortfolioEngine;
  broker: BrokerEngine;
  knowledge: KnowledgeEngine;
  vault: VaultEngine;
  marketStructure: MarketStructureEngine;
  liquidity: LiquidityEngine;
  orderBlock: OrderBlockEngine;
  fairValueGap: FairValueGapEngine;
  candlestick: CandlestickEngine;
  chartPattern: ChartPatternEngine;
  risk: RiskEngine;
  psychology: PsychologyEngine;
  backtesting: BacktestingEngine;
  decision: DecisionEngine;
  liveMarket: LiveMarketEngine;
  session: SessionEngine;
  ictMacro: ICTMacroEngine;
  fibonacci: FibonacciEngine;
  mtfConfluence: MTFConfluenceEngine;
  confidence: ConfidenceEngine;
  tradeJournal: TradeJournalEngine;
  confluenceScanner: ConfluenceScannerEngine;
  init(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  reportHealth(): Promise<EngineHealth[]>;
}

/**
 * Kernel wires every internal engine together. It exists so higher-level
 * services get a single entry point; nothing here is exposed to the UI.
 *
 * The kernel does NOT auto-start — the caller decides when boot begins,
 * which keeps SSR and test environments deterministic.
 */
export function createKernel(): Kernel {
  const bus = createEngineBus();
  const boot = new BootEngine();
  const health = new SystemHealthEngine();
  const reading = new MarketReadingEngine();
  const organization = new MarketOrganizationEngine();
  const realization = new MarketRealizationEngine();
  const candidates = new CandidateGenerationEngine();
  const marketData = new MarketDataEngine();
  const chart = new ChartEngine();
  const scanner = new MarketScannerEngine();
  const heatMap = new HeatMapEngine();
  const company = new CompanyIntelligenceEngine();
  const watchlist = new WatchlistEngine();
  const news = new NewsEngine();
  const economicCalendar = new EconomicCalendarEngine();
  const earningsCalendar = new EarningsCalendarEngine();
  const alerts = new AlertEngine();
  const portfolio = new PortfolioEngine();
  const broker = new BrokerEngine();
  const knowledge = new KnowledgeEngine();
  const vault = new VaultEngine();
  const marketStructure = new MarketStructureEngine();
  const liquidity = new LiquidityEngine();
  const orderBlock = new OrderBlockEngine();
  const fairValueGap = new FairValueGapEngine();
  const candlestick = new CandlestickEngine();
  const chartPattern = new ChartPatternEngine();
  const risk = new RiskEngine();
  const psychology = new PsychologyEngine();
  const backtesting = new BacktestingEngine();
  const decision = new DecisionEngine();
  const liveMarket = new LiveMarketEngine();
  const session = new SessionEngine();
  const ictMacro = new ICTMacroEngine();
  const fibonacci = new FibonacciEngine();
  const mtfConfluence = new MTFConfluenceEngine();
  const confidence = new ConfidenceEngine();
  const tradeJournal = new TradeJournalEngine();
  const confluenceScanner = new ConfluenceScannerEngine();

  const engines: Engine[] = [
    boot,
    health,
    reading,
    organization,
    realization,
    candidates,
    marketData,
    chart,
    scanner,
    heatMap,
    company,
    watchlist,
    news,
    economicCalendar,
    earningsCalendar,
    alerts,
    portfolio,
    broker,
    knowledge,
    vault,
    marketStructure,
    liquidity,
    orderBlock,
    fairValueGap,
    candlestick,
    chartPattern,
    risk,
    psychology,
    backtesting,
    decision,
    liveMarket,
    session,
    ictMacro,
    fibonacci,
    mtfConfluence,
    confidence,
    tradeJournal,
    confluenceScanner,
  ];

  boot.requires([
    "knowledge",
    "vault",
    "system-health",
    "market-reading",
    "market-organization",
    "market-realization",
    "candidate-generation",
    "market-data",
    "chart",
    "market-scanner",
    "heat-map",
    "company-intelligence",
    "watchlist",
    "news",
    "economic-calendar",
    "earnings-calendar",
    "alert",
    "portfolio",
    "broker",
    "market-structure",
    "liquidity",
    "order-block",
    "fair-value-gap",
    "candlestick",
    "chart-pattern",
    "risk",
    "psychology",
    "backtesting",
    "decision",
    "live-market",
    "session",
    "ict-macro",
    "fibonacci",
    "mtf-confluence",
    "confidence",
    "trade-journal",
    "confluence-scanner",
  ]);

  const makeCtx = (id: Engine["id"]): EngineContext => ({
    bus,
    now: () => Date.now(),
    logger: createEngineLogger(id),
  });

  return {
    bus,
    boot,
    health,
    reading,
    organization,
    realization,
    candidates,
    marketData,
    chart,
    scanner,
    heatMap,
    company,
    watchlist,
    news,
    economicCalendar,
    earningsCalendar,
    alerts,
    portfolio,
    broker,
    knowledge,
    vault,
    marketStructure,
    liquidity,
    orderBlock,
    fairValueGap,
    candlestick,
    chartPattern,
    risk,
    psychology,
    backtesting,
    decision,
    liveMarket,
    session,
    ictMacro,
    fibonacci,
    mtfConfluence,
    confidence,
    tradeJournal,
    confluenceScanner,
    async init() {
      for (const engine of engines) {
        await engine.init(makeCtx(engine.id));
      }
    },
    async start() {
      for (const engine of engines) {
        await engine.start();
      }
    },
    async stop() {
      for (const engine of [...engines].reverse()) {
        await engine.stop();
      }
    },
    async reportHealth() {
      return Promise.all(engines.map((e) => e.healthCheck()));
    },
  };
}
