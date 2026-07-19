import { BaseEngine } from "../base-engine";
import type { EngineHealth } from "../types";

type SubsystemId = "broker" | "market-data" | "database" | "api" | "engine";
type SubsystemState = "unknown" | "connected" | "degraded" | "disconnected";

interface SubsystemReport {
  id: SubsystemId;
  state: SubsystemState;
  lastCheckAt: number;
  message?: string;
}

/**
 * System Health Engine
 *
 * Continuously monitors the health of every subsystem the operating
 * system depends on: broker connection, market data feed, database, API
 * layer, and the engines themselves. Emits `health.report` events; owns
 * no logic beyond observation.
 */
export class SystemHealthEngine extends BaseEngine {
  private subsystems = new Map<SubsystemId, SubsystemReport>();
  private probes = new Map<SubsystemId, () => Promise<SubsystemState>>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;

  constructor(intervalMs = 5_000) {
    super("system-health");
    this.intervalMs = intervalMs;
    (["broker", "market-data", "database", "api", "engine"] as const).forEach(
      (id) => {
        this.subsystems.set(id, {
          id,
          state: "unknown",
          lastCheckAt: 0,
        });
      },
    );
  }

  registerProbe(id: SubsystemId, probe: () => Promise<SubsystemState>) {
    this.probes.set(id, probe);
  }

  protected async onStart() {
    this.timer = setInterval(() => {
      void this.runProbes();
    }, this.intervalMs);
  }

  protected async onStop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async runProbes() {
    let anyDegraded = false;
    let anyDown = false;
    for (const [id, probe] of this.probes) {
      let state: SubsystemState = "unknown";
      let message: string | undefined;
      try {
        state = await probe();
      } catch (error) {
        state = "disconnected";
        message = error instanceof Error ? error.message : String(error);
      }
      this.subsystems.set(id, {
        id,
        state,
        lastCheckAt: this.ctx.now(),
        message,
      });
      if (state === "degraded") anyDegraded = true;
      if (state === "disconnected") anyDown = true;
    }
    if (anyDown) this.setStatus("degraded", "one or more subsystems down");
    else if (anyDegraded) this.setStatus("degraded", "subsystem degraded");
    else this.setStatus("running");
    await this.healthCheck();
  }

  protected async onHealthCheck(): Promise<EngineHealth["details"]> {
    return {
      subsystems: Array.from(this.subsystems.values()),
      intervalMs: this.intervalMs,
    };
  }
}
