import { BaseEngine } from "../base-engine";
import { TradeJournal } from "../trade-journal/journal";
import type {
  CloseTradeInput,
  JournalQuery,
  JournalStats,
  OpenTradeInput,
  TradeEntry,
} from "../trade-journal/types";

/**
 * Automatic Trade Journal Engine — records every trade lifecycle event
 * and derives R-multiples, hold time, and rolling stats.
 */
export class TradeJournalEngine extends BaseEngine {
  private journal = new TradeJournal();

  constructor() {
    super("trade-journal");
  }

  open(input: OpenTradeInput): TradeEntry {
    return this.journal.open(input);
  }

  close(input: CloseTradeInput): TradeEntry {
    return this.journal.close(input);
  }

  cancel(id: string): void {
    this.journal.cancel(id);
  }

  note(id: string, text: string): void {
    this.journal.addNote(id, text);
  }

  tag(id: string, tag: string): void {
    this.journal.addTag(id, tag);
  }

  get(id: string): TradeEntry | undefined {
    return this.journal.get(id);
  }

  list(query: JournalQuery = {}): TradeEntry[] {
    return this.journal.list(query);
  }

  stats(query: JournalQuery = {}): JournalStats {
    return this.journal.stats(query);
  }

  protected async onHealthCheck() {
    return { trades: this.journal.list().length };
  }
}
