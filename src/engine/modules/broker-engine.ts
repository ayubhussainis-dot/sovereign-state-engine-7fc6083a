import { BaseEngine } from "../base-engine";
import type { Order, OrderSide, OrderType } from "./portfolio-engine";

export type BrokerId = "alpaca" | string;

export type BrokerConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface BrokerCredentials {
  keyId: string;
  secret: string;
  paper?: boolean;
}

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  clientOrderId?: string;
}

export interface BrokerAdapter {
  readonly id: BrokerId;
  connect(creds: BrokerCredentials): Promise<void>;
  disconnect(): Promise<void>;
  state(): BrokerConnectionState;
  submitOrder(req: OrderRequest): Promise<Order>;
  cancelOrder(id: string): Promise<void>;
  syncAccount(): Promise<void>;
}

/**
 * Broker Integration Engine
 *
 * Adapter registry for broker connections (Alpaca first). The engine
 * exposes the routing surface; adapters are not implemented here and
 * no live connection is opened until one is explicitly registered and
 * connected by future code.
 */
export class BrokerEngine extends BaseEngine {
  private adapters = new Map<BrokerId, BrokerAdapter>();
  private active: BrokerId | null = null;

  constructor() {
    super("broker");
  }

  registerAdapter(adapter: BrokerAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  listAdapters(): BrokerId[] {
    return Array.from(this.adapters.keys());
  }

  activeAdapter(): BrokerAdapter | null {
    return this.active ? (this.adapters.get(this.active) ?? null) : null;
  }

  async use(id: BrokerId, creds: BrokerCredentials): Promise<void> {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`broker adapter not registered: ${id}`);
    await adapter.connect(creds);
    this.active = id;
  }

  async disconnect(): Promise<void> {
    const a = this.activeAdapter();
    if (!a) return;
    await a.disconnect();
    this.active = null;
  }

  connectionState(): BrokerConnectionState {
    return this.activeAdapter()?.state() ?? "disconnected";
  }

  async submitOrder(req: OrderRequest): Promise<Order> {
    const a = this.activeAdapter();
    if (!a) throw new Error("no active broker adapter");
    return a.submitOrder(req);
  }

  async cancelOrder(id: string): Promise<void> {
    const a = this.activeAdapter();
    if (!a) throw new Error("no active broker adapter");
    return a.cancelOrder(id);
  }

  protected async onHealthCheck() {
    return {
      adapters: this.listAdapters(),
      active: this.active,
      state: this.connectionState(),
    };
  }
}
