export type TickRecord = {
  price: number;
  timestamp: number;
};

export class EDARTRADEEngine {
  private entryFloor: number;
  private profitTargetPct: number;
  private stopLossPct: number;
  private positionActive: boolean = false;
  private entryPrice: number = 0;
  private tickHistory: TickRecord[] = [];

  constructor(entryFloorPrice: number, profitTargetPct: number, stopLossPct: number) {
    this.entryFloor = entryFloorPrice;
    this.profitTargetPct = profitTargetPct;
    this.stopLossPct = stopLossPct;
  }

  public ingestTick(price: number, timestamp: number): string | null {
    this.tickHistory.push({ price, timestamp });
    
    // Keep only the last 10 ticks for rapid pulse analysis[span_1](start_span)[span_1](end_span)
    if (this.tickHistory.length > 10) {
      this.tickHistory.shift();
    }
    
    // Wait for enough ticks to calculate dwell time deltas
    if (this.tickHistory.length < 3) {
      return null;
    }

    if (!this.positionActive) {
      return this.evaluateEntryRules(price);
    } else {
      return this.evaluateExitRules(price);
    }
  }

  private evaluateEntryRules(currentPrice: number): string | null {
    const deltas: number[] = [];
    for (let i = 1; i < this.tickHistory.length; i++) {
      deltas.push(this.tickHistory[i].timestamp - this.tickHistory[i - 1].timestamp);
    }
    
    // Check if the latest tick interval shortened (Acceleration / PCM bit '1')[span_2](start_span)[span_2](end_span)
    const isAccelerating = deltas.length >= 2 && deltas[deltas.length - 1] < deltas[deltas.length - 2];

    if (currentPrice >= this.entryFloor && isAccelerating) {
      this.positionActive = true;
      this.entryPrice = currentPrice;
      return `ACTION: ENTER_LONG | Price: ${currentPrice} | Trigger: Floor met + Dwell acceleration confirmed.`;
    }
    return null;
  }

  private evaluateExitRules(currentPrice: number): string | null {
    const pnlPct = (currentPrice - this.entryPrice) / this.entryPrice;
    
    if (pnlPct >= this.profitTargetPct) {
      const exitPrice = currentPrice;
      this.positionActive = false;
      return `ACTION: EXIT_PROFIT | Price: ${exitPrice} | Target reached (+${(pnlPct * 100).toFixed(2)}%)`;
    } else if (pnlPct <= -this.stopLossPct) {
      const exitPrice = currentPrice;
      this.positionActive = false;
      return `ACTION: EXIT_STOP_LOSS | Price: ${exitPrice} | Risk limit hit (-${(Math.abs(pnlPct) * 100).toFixed(2)}%)`;
    }
    return null;
  }
}

