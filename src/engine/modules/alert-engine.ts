import { BaseEngine } from "../base-engine";

export type AlertKind =
  | "price"
  | "volume"
  | "technical"
  | "news"
  | "earnings"
  | "custom";

export type AlertState = "armed" | "triggered" | "disabled";

export interface AlertRule {
  id: string;
  kind: AlertKind;
  symbol?: string;
  expression: string;
  state: AlertState;
  createdAt: number;
  triggeredAt?: number;
  meta?: Record<string, unknown>;
}

export type AlertEvaluator = (rule: AlertRule) => Promise<boolean> | boolean;

/**
 * Alert Engine
 *
 * Stores alert rules and evaluates them against a registered evaluator.
 * Rules never auto-fire without an evaluator connected.
 */
export class AlertEngine extends BaseEngine {
  private rules = new Map<string, AlertRule>();
  private evaluator: AlertEvaluator | null = null;

  constructor() {
    super("alert");
  }

  setEvaluator(evaluator: AlertEvaluator) {
    this.evaluator = evaluator;
  }

  add(rule: Omit<AlertRule, "createdAt" | "state">): AlertRule {
    const r: AlertRule = { ...rule, state: "armed", createdAt: this.ctx.now() };
    this.rules.set(r.id, r);
    return r;
  }

  disable(id: string) {
    const r = this.rules.get(id);
    if (r) r.state = "disabled";
  }

  remove(id: string): boolean {
    return this.rules.delete(id);
  }

  list(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  async evaluateAll(): Promise<AlertRule[]> {
    if (!this.evaluator) return [];
    const fired: AlertRule[] = [];
    for (const rule of this.rules.values()) {
      if (rule.state !== "armed") continue;
      const hit = await this.evaluator(rule);
      if (hit) {
        rule.state = "triggered";
        rule.triggeredAt = this.ctx.now();
        fired.push(rule);
      }
    }
    return fired;
  }

  protected async onHealthCheck() {
    return {
      total: this.rules.size,
      armed: this.list().filter((r) => r.state === "armed").length,
      hasEvaluator: this.evaluator !== null,
    };
  }
}
