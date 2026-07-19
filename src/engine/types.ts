/**
 * HETIS — Internal Engine Types
 *
 * Shared type surface for every internal engine module. These types are
 * intentionally minimal and framework-agnostic so each engine can evolve
 * independently without leaking implementation details.
 *
 * No UI, no trading logic, no execution. Internal only.
 */

export type EngineId =
  | "boot"
  | "system-health"
  | "market-reading"
  | "market-organization"
  | "market-realization"
  | "candidate-generation"
  | "market-data"
  | "chart"
  | "market-scanner"
  | "heat-map"
  | "company-intelligence"
  | "watchlist"
  | "news"
  | "economic-calendar"
  | "earnings-calendar"
  | "alert"
  | "portfolio"
  | "broker"
  | "knowledge"
  | "market-structure"
  | "liquidity"
  | "order-block"
  | "fair-value-gap"
  | "candlestick"
  | "chart-pattern"
  | "risk"
  | "psychology"
  | "backtesting"
  | "decision"
  | "live-market"
  | "vault"
  | "session"
  | "ict-macro"
  | "fibonacci"
  | "mtf-confluence"
  | "confidence"
  | "trade-journal"
  | "confluence-scanner";

export type EngineStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "running"
  | "degraded"
  | "stopped"
  | "error";

export interface EngineContext {
  bus: EngineBus;
  now: () => number;
  logger: EngineLogger;
}

export interface EngineLogger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface Engine {
  readonly id: EngineId;
  readonly status: EngineStatus;
  init(ctx: EngineContext): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  healthCheck(): Promise<EngineHealth>;
}

export interface EngineHealth {
  id: EngineId;
  status: EngineStatus;
  lastCheckAt: number;
  message?: string;
  details?: Record<string, unknown>;
}

export type EngineEvent =
  | { type: "engine.status"; id: EngineId; status: EngineStatus; at: number }
  | { type: "engine.error"; id: EngineId; error: string; at: number }
  | { type: "health.report"; report: EngineHealth }
  | { type: "market.tick"; source: string; payload: unknown; at: number }
  | { type: "market.organized"; payload: unknown; at: number }
  | { type: "market.realization"; payload: unknown; at: number }
  | { type: "candidate.generated"; payload: unknown; at: number };

export type EngineEventType = EngineEvent["type"];

export type EngineBus = {
  emit: (event: EngineEvent) => void;
  on: <T extends EngineEventType>(
    type: T,
    handler: (event: Extract<EngineEvent, { type: T }>) => void,
  ) => () => void;
};
