import { BaseEngine } from "../base-engine";
import type { EngineId } from "../types";

/**
 * Boot Engine
 *
 * Initialize the operating system and verify system readiness before any
 * downstream engine is allowed to run. Every other engine must be
 * registered with the boot sequence; boot completes only when each one
 * reports `ready`.
 *
 * Boot never touches markets, brokers, or user data. It is a gate.
 */
export class BootEngine extends BaseEngine {
  private required: EngineId[] = [];
  private readyIds = new Set<EngineId>();

  constructor() {
    super("boot");
  }

  requires(ids: EngineId[]) {
    this.required = [...ids];
  }

  protected async onInit() {
    this.ctx.bus.on("engine.status", (event) => {
      if (this.required.includes(event.id) && event.status === "ready") {
        this.readyIds.add(event.id);
        if (this.isBootComplete()) {
          this.ctx.logger.info("boot complete");
        }
      }
    });
  }

  protected async onStart() {
    this.ctx.logger.info("boot sequence started", {
      required: this.required,
    });
  }

  isBootComplete(): boolean {
    return this.required.every((id) => this.readyIds.has(id));
  }

  protected async onHealthCheck() {
    return {
      required: this.required,
      ready: Array.from(this.readyIds),
      complete: this.isBootComplete(),
    };
  }
}
