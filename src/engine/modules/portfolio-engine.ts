import { BaseEngine } from "../base-engine";

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_limit";
export type OrderStatus =
  | "new"
  | "accepted"
  | "partially_filled"
  | "filled"
  | "canceled"
  | "rejected";

export interface Position {
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  marketValue?: number;
  unrealizedPnL?: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  submittedAt: number;
  filledAt?: number;
}

export interface AccountSnapshot {
  cash: number;
  buyingPower: number;
  equity: number;
  currency: string;
  asOf: number;
}

export interface PerformancePoint {
  timestamp: number;
  equity: number;
}

export interface PortfolioSource {
  readonly id: string;
  getAccount(): Promise<AccountSnapshot | null>;
  getPositions(): Promise<Position[]>;
  getOrders(): Promise<Order[]>;
  getPerformance(from: number, to: number): Promise<PerformancePoint[]>;
}

/**
 * Portfolio Engine
 *
 * Read-only surface over holdings, orders, positions, cash and
 * performance. Execution is handled by the Broker Engine. Returns
 * null / [] when no source is connected.
 */
export class PortfolioEngine extends BaseEngine {
  private source: PortfolioSource | null = null;

  constructor() {
    super("portfolio");
  }

  registerSource(source: PortfolioSource) {
    this.source = source;
  }

  async getAccount(): Promise<AccountSnapshot | null> {
    return this.source?.getAccount() ?? null;
  }

  async getPositions(): Promise<Position[]> {
    return (await this.source?.getPositions()) ?? [];
  }

  async getOrders(): Promise<Order[]> {
    return (await this.source?.getOrders()) ?? [];
  }

  async getPerformance(from: number, to: number): Promise<PerformancePoint[]> {
    return (await this.source?.getPerformance(from, to)) ?? [];
  }

  protected async onHealthCheck() {
    return { source: this.source?.id ?? null };
  }
}
