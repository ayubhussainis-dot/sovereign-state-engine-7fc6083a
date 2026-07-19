import { BaseEngine } from "../base-engine";

export interface Candidate {
  id: string;
  symbol?: string;
  rationale: string;
  score: number;
  createdAt: number;
  meta?: Record<string, unknown>;
}

export type CandidateStrategy = (realization: unknown) => Candidate[] | null;

/**
 * Candidate Generation Engine
 *
 * Consumes realization events and produces a queue of candidate
 * opportunities for later evaluation by future modules. Execution is
 * explicitly out of scope — candidates are queued and emitted, never
 * acted upon here.
 */
export class CandidateGenerationEngine extends BaseEngine {
  private strategies: CandidateStrategy[] = [];
  private queue: Candidate[] = [];
  private maxQueue: number;
  private unsubscribe: (() => void) | null = null;

  constructor(maxQueue = 500) {
    super("candidate-generation");
    this.maxQueue = maxQueue;
  }

  registerStrategy(strategy: CandidateStrategy) {
    this.strategies.push(strategy);
  }

  peek(): readonly Candidate[] {
    return this.queue;
  }

  drain(): Candidate[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  protected async onStart() {
    this.unsubscribe = this.ctx.bus.on("market.realization", (event) => {
      for (const strategy of this.strategies) {
        const produced = strategy(event.payload);
        if (!produced || produced.length === 0) continue;
        for (const candidate of produced) {
          this.enqueue(candidate);
        }
      }
    });
  }

  protected async onStop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private enqueue(candidate: Candidate) {
    this.queue.push(candidate);
    if (this.queue.length > this.maxQueue) {
      this.queue.splice(0, this.queue.length - this.maxQueue);
    }
    this.ctx.bus.emit({
      type: "candidate.generated",
      payload: candidate,
      at: this.ctx.now(),
    });
  }

  protected async onHealthCheck() {
    return {
      strategies: this.strategies.length,
      queued: this.queue.length,
      maxQueue: this.maxQueue,
    };
  }
}
