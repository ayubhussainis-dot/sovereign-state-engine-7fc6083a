export class EDARTRADEEngine {
  private entryFloor: number;
  private profitTargetPct: number;
  private stopLossPct: number;
  private positionActive: boolean;
  private entryPrice: number;
  private tickHistory: Array<{ price: number; timestamp: number }>;

  constructor(entryFloorPrice: number, profitTargetPct: number, stopLossPct: number) {
    this.entryFloor = entryFloorPrice;
    this.profitTargetPct = profitTargetPct;
    this.stopLossPct = stopLossPct;
    this.positionActive = false;
    this.entryPrice = 0.0;
    this.tickHistory = [];
  }

  public ingestTick(price: number, timestamp: number): string | null {
    // Ingests raw market tick, evaluates structural dwell time, and checks entry/exit rule conditions.
    this.tickHistory.push({ price, timestamp });
    
    // Keep only the last 10 ticks for rapid pulse analysis
    if (this.tickHistory.length > 10) {
      this.tickHistory.shift();
    }

    // If we don't have enough ticks to calculate pulse/dwell time, wait
    if (this.tickHistory.length < 3) {
      return null;
    }

    // Evaluate state rules
    if (!this.positionActive) {
      return this.evaluateEntryRules(price);
    } else {
      return this.evaluateExitRules(price);
    }
  }

  private evaluateEntryRules(currentPrice: number): string | null {
    // Entry Rule: Triggers only when price hits/crosses the structural entry floor
    // AND the dwell time shows market acceleration (PCM bit '1').
    const deltas: number[] = [];
    for (let i = 1; i < this.tickHistory.length; i++) {
      deltas.push(this.tickHistory[i].timestamp - this.tickHistory[i - 1].timestamp);
    }

    // Check if the latest tick interval shortened (Acceleration / PCM '1')
    const isAccelerating = deltas.length >= 2 ? deltas[deltas.length - 1] < deltas[deltas.length - 2] : false;

    // Condition 1: Price touches or crosses the entry floor
    // Condition 2: Structural acceleration is confirmed by dwell time shortening
    if (currentPrice >= this.entryFloor && isAccelerating) {
      this.positionActive = true;
      this.entryPrice = currentPrice;
      return `ACTION: ENTER_LONG | Price: ${currentPrice} | Trigger: Floor met + Dwell acceleration confirmed.`;
    }

    return null;
  }

  private evaluateExitRules(currentPrice: number): string | null {
    // Exit Rule: Deterministic scale-out when profit target or stop loss is breached.
    const pnlPct = (currentPrice - this.entryPrice) / this.entryPrice;

    if (pnlPct >= this.profitTargetPct) {
      const exitPrice = currentPrice;
      this.positionActive = false;
      return `ACTION: EXIT_PROFIT | Price: ${exitPrice} | Target reached (+${(pnlPct * 100).toFixed(2)}%)`;
    } else if (pnlPct <= -this.stop_loss_pct) {
      const exitPrice = currentPrice;
      this.positionActive = false;
      return `ACTION: EXIT_STOP_LOSS | Price: ${exitPrice} | Risk limit hit (-${(Math.abs(pnlPct) * 100).toFixed(2)}%)`;
    }

    return null;
  }

  private get stop_loss_pct(): number {
    return this.stopLossPct;
  }
}
