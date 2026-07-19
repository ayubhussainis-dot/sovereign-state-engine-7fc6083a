import { BaseEngine } from "../base-engine";
import { PsychologyJournal } from "../psychology/journal";
import type {
  BiasFlag,
  DisciplineStats,
  JournalEntry,
  PsychologyOptions,
} from "../psychology/types";

/**
 * Psychology Engine — owns a PsychologyJournal and evaluates behavioral
 * biases after each recorded entry. In-memory only; persistence is
 * outside this phase.
 */
export class PsychologyEngine extends BaseEngine {
  private journal: PsychologyJournal;
  private lastFlags: BiasFlag[] = [];

  constructor(options: PsychologyOptions = {}) {
    super("psychology");
    this.journal = new PsychologyJournal(options);
  }

  record(entry: JournalEntry): BiasFlag[] {
    this.lastFlags = this.journal.record(entry);
    return this.lastFlags;
  }

  entries(): readonly JournalEntry[] {
    return this.journal.list();
  }

  stats(): DisciplineStats {
    return this.journal.stats();
  }

  reset(): void {
    this.journal.clear();
    this.lastFlags = [];
  }

  protected async onHealthCheck() {
    return {
      entries: this.journal.list().length,
      lastFlags: this.lastFlags.length,
    };
  }
}
