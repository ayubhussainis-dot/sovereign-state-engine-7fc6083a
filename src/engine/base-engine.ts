import type {
  Engine,
  EngineContext,
  EngineHealth,
  EngineId,
  EngineStatus,
} from "./types";

/**
 * Base class every internal engine extends. Owns lifecycle bookkeeping,
 * status transitions, and health reporting so concrete engines can focus
 * on their specific responsibility.
 */
export abstract class BaseEngine implements Engine {
  public readonly id: EngineId;
  public status: EngineStatus = "idle";
  protected ctx!: EngineContext;
  protected lastCheckAt = 0;
  protected message?: string;

  constructor(id: EngineId) {
    this.id = id;
  }

  async init(ctx: EngineContext): Promise<void> {
    this.ctx = ctx;
    this.setStatus("initializing");
    try {
      await this.onInit();
      this.setStatus("ready");
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.status === "running") return;
    try {
      await this.onStart();
      this.setStatus("running");
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.onStop();
      this.setStatus("stopped");
    } catch (error) {
      this.fail(error);
    }
  }

  async healthCheck(): Promise<EngineHealth> {
    this.lastCheckAt = this.ctx?.now?.() ?? Date.now();
    const details = await this.onHealthCheck();
    const report: EngineHealth = {
      id: this.id,
      status: this.status,
      lastCheckAt: this.lastCheckAt,
      message: this.message,
      details,
    };
    this.ctx?.bus.emit({ type: "health.report", report });
    return report;
  }

  protected setStatus(status: EngineStatus, message?: string) {
    this.status = status;
    this.message = message;
    this.ctx?.bus.emit({
      type: "engine.status",
      id: this.id,
      status,
      at: this.ctx.now(),
    });
  }

  protected fail(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.setStatus("error", message);
    this.ctx?.bus.emit({
      type: "engine.error",
      id: this.id,
      error: message,
      at: this.ctx.now(),
    });
    this.ctx?.logger.error(message);
  }

  // Subclass hooks — override as needed. Defaults are no-ops so concrete
  // engines only implement what they actually need.
  protected async onInit(): Promise<void> {}
  protected async onStart(): Promise<void> {}
  protected async onStop(): Promise<void> {}
  protected async onHealthCheck(): Promise<Record<string, unknown> | undefined> {
    return undefined;
  }
}
