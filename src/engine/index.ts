/**
 * HETIS — Internal Engine Architecture
 *
 * Public surface of the engine layer. Import from `@/engine` only — never
 * reach into `modules/*` directly from feature code. The UI must not
 * consume these modules yet; this phase establishes architecture only.
 */
export type {
  Engine,
  EngineBus,
  EngineContext,
  EngineEvent,
  EngineEventType,
  EngineHealth,
  EngineId,
  EngineLogger,
  EngineStatus,
} from "./types";

export { createEngineBus } from "./bus";
export { createEngineLogger } from "./logger";
export { BaseEngine } from "./base-engine";

export { BootEngine } from "./modules/boot-engine";
export { SystemHealthEngine } from "./modules/system-health-engine";
export { MarketReadingEngine } from "./modules/market-reading-engine";
export { MarketOrganizationEngine } from "./modules/market-organization-engine";
export { MarketRealizationEngine } from "./modules/market-realization-engine";
export { CandidateGenerationEngine } from "./modules/candidate-generation-engine";

export { KnowledgeEngine } from "./modules/knowledge-engine";
export { KNOWLEDGE_DOMAINS } from "./knowledge";
export type {
  KnowledgeCategory,
  KnowledgeDomain,
  KnowledgeDomainId,
  KnowledgeEntry,
  KnowledgeQuery,
  KnowledgeStats,
} from "./knowledge/types";

export { VaultEngine } from "./modules/vault-engine";
export {
  VaultStore,
  KnowledgeGraph,
  VaultImportPipeline,
} from "./vault";
export type {
  GraphNeighbor,
  VaultCategory,
  VaultEdgeKind,
  VaultId,
  VaultImportInput,
  VaultImportResult,
  VaultNote,
  VaultQuery,
  VaultRelation,
  VaultSource,
  VaultSourceKind,
  VaultStats,
  VaultTag,
} from "./vault";

export { MarketDataEngine } from "./modules/market-data-engine";
export type {
  MarketDataProvider,
  Quote,
  Bar,
  MarketSession,
} from "./modules/market-data-engine";

export { ChartEngine } from "./modules/chart-engine";
export type {
  ChartConfig,
  ChartType,
  Timeframe,
  Indicator,
  DrawingTool,
  BarsLoader,
} from "./modules/chart-engine";

export { MarketScannerEngine } from "./modules/market-scanner-engine";
export type {
  ScannerCriteria,
  ScannerFilter,
  ScannerField,
  ScannerResult,
  ScannerSource,
  Comparator,
} from "./modules/market-scanner-engine";

export { HeatMapEngine } from "./modules/heat-map-engine";
export type {
  HeatMapScope,
  HeatMapCell,
  HeatMapSnapshot,
  HeatMapSource,
} from "./modules/heat-map-engine";

export { CompanyIntelligenceEngine } from "./modules/company-intelligence-engine";
export type {
  CompanyProfile,
  FinancialOverview,
  CompanyIntelligenceProvider,
} from "./modules/company-intelligence-engine";

export { WatchlistEngine } from "./modules/watchlist-engine";
export type { Watchlist, WatchlistKind } from "./modules/watchlist-engine";

export { NewsEngine } from "./modules/news-engine";
export type {
  NewsItem,
  NewsQuery,
  NewsScope,
  NewsProvider,
} from "./modules/news-engine";

export { EconomicCalendarEngine } from "./modules/economic-calendar-engine";
export type {
  EconomicEvent,
  EconomicKind,
  EconomicImpact,
  EconomicCalendarQuery,
  EconomicCalendarSource,
} from "./modules/economic-calendar-engine";

export { EarningsCalendarEngine } from "./modules/earnings-calendar-engine";
export type {
  EarningsEvent,
  EarningsWindow,
  EarningsCalendarQuery,
  EarningsCalendarSource,
} from "./modules/earnings-calendar-engine";

export { AlertEngine } from "./modules/alert-engine";
export type {
  AlertRule,
  AlertKind,
  AlertState,
  AlertEvaluator,
} from "./modules/alert-engine";

export { PortfolioEngine } from "./modules/portfolio-engine";
export type {
  Position,
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  AccountSnapshot,
  PerformancePoint,
  PortfolioSource,
} from "./modules/portfolio-engine";

export { BrokerEngine } from "./modules/broker-engine";
export type {
  BrokerId,
  BrokerAdapter,
  BrokerCredentials,
  BrokerConnectionState,
  OrderRequest,
} from "./modules/broker-engine";

export { createKernel } from "./kernel";
export type { Kernel } from "./kernel";

export { MarketStructureEngine } from "./modules/market-structure-engine";
export { analyzeStructure, detectPivots } from "./market-structure";
export type {
  OHLCBar,
  PivotKind,
  StructureAnalysis,
  StructureBias,
  StructureEvent,
  StructureEventKind,
  StructureOptions,
  SwingLabel,
  SwingPoint,
} from "./market-structure";

export { LiquidityEngine } from "./modules/liquidity-engine";
export { analyzeLiquidity } from "./liquidity";
export type {
  LiquidityAnalysis,
  LiquidityEvent,
  LiquidityEventKind,
  LiquidityOptions,
  LiquidityPool,
  LiquiditySide,
} from "./liquidity";

export { OrderBlockEngine } from "./modules/order-block-engine";
export { detectOrderBlocks } from "./order-block";
export type {
  OrderBlock,
  OrderBlockAnalysis,
  OrderBlockKind,
  OrderBlockOptions,
} from "./order-block";

export { FairValueGapEngine } from "./modules/fair-value-gap-engine";
export { detectFairValueGaps } from "./fair-value-gap";
export type {
  FVGAnalysis,
  FVGKind,
  FVGOptions,
  FairValueGap,
} from "./fair-value-gap";

export { CandlestickEngine } from "./modules/candlestick-engine";
export { detectCandlestickPatterns } from "./candlestick";
export type {
  CandlestickAnalysis,
  CandlestickBias,
  CandlestickOptions,
  CandlestickPattern,
  CandlestickPatternId,
} from "./candlestick";

export { ChartPatternEngine } from "./modules/chart-pattern-engine";
export { detectChartPatterns } from "./chart-pattern";
export type {
  ChartPattern,
  ChartPatternAnalysis,
  ChartPatternBias,
  ChartPatternId,
  ChartPatternOptions,
} from "./chart-pattern";

export { RiskEngine } from "./modules/risk-engine";
export {
  assessPortfolioRisk,
  calculatePositionSize,
  computeDrawdown,
  rMultiple,
  volatilityTargetShares,
} from "./risk";
export type {
  DrawdownStats,
  EquityPoint,
  OpenExposure,
  PortfolioRisk,
  RMultipleInput,
  RiskAccount,
  RiskSide,
  SizingInput,
  SizingResult,
  VolTargetInput,
} from "./risk";

export { PsychologyEngine } from "./modules/psychology-engine";
export { PsychologyJournal } from "./psychology";
export type {
  BiasFlag,
  BiasId,
  DisciplineStats,
  Emotion,
  JournalEntry,
  PsychologyOptions,
} from "./psychology";

export { BacktestingEngine } from "./modules/backtesting-engine";
export { runBacktest } from "./backtesting";
export type {
  BacktestConfig,
  BacktestContext,
  BacktestFill,
  BacktestOrder,
  BacktestPosition,
  BacktestReport,
  BacktestSide,
  BacktestStrategy,
  BacktestTrade,
} from "./backtesting";

export { DecisionEngine } from "./modules/decision-engine";
export { decide } from "./decision";
export type {
  Decision,
  DecisionBias,
  DecisionInputs,
  DecisionOptions,
  DecisionPlan,
  DecisionSignal,
} from "./decision";

export { LiveMarketEngine } from "./modules/live-market-engine";
export type {
  LiveBar,
  LiveConnectionStatus,
  LiveMarketHealth,
  LiveMarketProvider,
  LiveQuote,
  MarketSession as LiveMarketSession,
  Unsubscribe as LiveMarketUnsubscribe,
} from "./live-market";

export { SessionEngine } from "./modules/session-engine";
export { analyzeSessions, sessionWindow, SESSION_WINDOWS } from "./session";
export type {
  SessionAnalysis,
  SessionId,
  SessionOptions,
  SessionRange,
  SessionWindow,
} from "./session";

export { ICTMacroEngine } from "./modules/ict-macro-engine";
export { analyzeICTMacros, ictMacro, ICT_MACROS } from "./ict-macro";
export type {
  ICTMacroAnalysis,
  ICTMacroId,
  ICTMacroOptions,
  ICTMacroSnapshot,
  ICTMacroWindow,
} from "./ict-macro";

export { FibonacciEngine } from "./modules/fibonacci-engine";
export { calculateFibonacci, inOTE } from "./fibonacci";
export type {
  FibAnalysis,
  FibDirection,
  FibLeg,
  FibLevel,
  FibOTE,
  FibOptions,
} from "./fibonacci";

export { MTFConfluenceEngine } from "./modules/mtf-confluence-engine";
export { analyzeMTFConfluence } from "./mtf-confluence";
export type {
  MTFBias,
  MTFBiasBreakdown,
  MTFConfluenceOptions,
  MTFConfluenceResult,
  MTFSnapshot,
  MTFTimeframe,
} from "./mtf-confluence";

export { ConfidenceEngine } from "./modules/confidence-engine";
export { scoreConfidence } from "./confidence";
export type {
  ConfidenceFactor,
  ConfidenceGrade,
  ConfidenceOptions,
  ConfidenceResult,
} from "./confidence";

export { TradeJournalEngine } from "./modules/trade-journal-engine";
export { TradeJournal } from "./trade-journal";
export type {
  CloseTradeInput,
  JournalQuery,
  JournalStats,
  OpenTradeInput,
  TradeEntry,
  TradeExecution,
  TradeSetup,
  TradeSide,
  TradeStatus,
} from "./trade-journal";

export { ConfluenceScannerEngine } from "./modules/confluence-scanner-engine";
export { scanConfluence } from "./confluence-scanner";
export type {
  ConfluenceBias,
  ConfluenceCandidate,
  ConfluenceHit,
  ConfluenceScanOptions,
  ConfluenceScanResult,
  ScannerInputSymbol,
} from "./confluence-scanner";
