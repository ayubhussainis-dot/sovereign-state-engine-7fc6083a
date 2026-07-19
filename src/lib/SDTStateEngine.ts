/**
 * Sovereign Deterministic Terminal (SDT) Core State Machine Engine
 * Architecture: Eukaryotic Cell Cycle Model (G0 -> G1 -> S -> M)
 */

export type SDTState =
  | "G0_HOMEOSTASIS"
  | "G1_ACCUMULATION"
  | "S_SYNTHESIS"
  | "M_MITOSIS"
  | "P53_ARREST";

export interface TelemetryData {
  currentPrice: number;
  currentOfi: number;
  liquidityDepth: number;
  volatility: number;
}

export interface RiskProfile {
  equityHighWaterMark: number;
  currentEquity: number;
  baseLeverage: number;
  zScoreThreshold: number;
}

export class SDTStateEngine {
  private currentState: SDTState = "G0_HOMEOSTASIS";
  private priceHistory: number[] = [];
  private rollingWindowSize: number = 200;
  private lastZScore: number = 0;
  private lastMultiplier: number = 0;

  constructor(
    private riskProfile: RiskProfile,
    private onStateChange?: (oldState: SDTState, newState: SDTState) => void,
  ) {}

  public step(telemetry: TelemetryData): void {
    if (this.checkP53Checkpoint()) return;
    this.updatePriceHistory(telemetry.currentPrice);

    switch (this.currentState) {
      case "G0_HOMEOSTASIS":
        this.evaluateG0ToG1Transition();
        break;
      case "G1_ACCUMULATION":
        this.evaluateRestrictionPoint(telemetry);
        break;
      case "S_SYNTHESIS":
        this.executeSSynthesis(telemetry);
        break;
      case "M_MITOSIS":
        break;
      case "P53_ARREST":
        break;
    }
  }

  private checkP53Checkpoint(): boolean {
    if (this.currentState === "P53_ARREST") return true;
    const dd =
      (this.riskProfile.equityHighWaterMark - this.riskProfile.currentEquity) /
      this.riskProfile.equityHighWaterMark;
    if (dd >= 0.05) {
      this.transitionTo("P53_ARREST");
      this.triggerApoptosis();
      return true;
    }
    return false;
  }

  private evaluateG0ToG1Transition(): void {
    if (this.priceHistory.length < this.rollingWindowSize) return;
    const z = this.calculateRollingZScore();
    this.lastZScore = z;
    if (Math.abs(z) > this.riskProfile.zScoreThreshold) {
      this.transitionTo("G1_ACCUMULATION");
    }
  }

  private evaluateRestrictionPoint(_telemetry: TelemetryData): void {
    const dd =
      (this.riskProfile.equityHighWaterMark - this.riskProfile.currentEquity) /
      this.riskProfile.equityHighWaterMark;
    if (dd >= 0.05) {
      this.transitionTo("P53_ARREST");
      return;
    }
    this.transitionTo("S_SYNTHESIS");
  }

  private executeSSynthesis(telemetry: TelemetryData): void {
    const dd =
      (this.riskProfile.equityHighWaterMark - this.riskProfile.currentEquity) /
      this.riskProfile.equityHighWaterMark;
    const rScalar = dd >= 0.015 ? 0.5 : 1.0;
    const cWeight =
      telemetry.volatility > 0 ? telemetry.liquidityDepth / telemetry.volatility : 1.0;
    const vMkt = Math.abs(telemetry.currentOfi);
    const sMultiplier = vMkt * cWeight * rScalar * this.riskProfile.baseLeverage;
    this.lastMultiplier = sMultiplier;
    this.transitionTo("M_MITOSIS");
    this.executeMitosisOrder(sMultiplier);
  }

  private triggerApoptosis(): void {
    console.error(
      "🚨 [CRITICAL ALERT] p53 Apoptosis Triggered. Systemic plaque detected at 5.0% drawdown.",
    );
  }

  private executeMitosisOrder(multiplier: number): void {
    console.log(
      `🚀 [MITOSIS] Order authorized with calculated S-Multiplier: ${multiplier.toFixed(4)}`,
    );
  }

  private calculateRollingZScore(): number {
    const subset = this.priceHistory.slice(-this.rollingWindowSize);
    const mean = subset.reduce((a, b) => a + b, 0) / this.rollingWindowSize;
    const variance =
      subset.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.rollingWindowSize;
    const stdDev = Math.sqrt(variance);
    const latest = this.priceHistory[this.priceHistory.length - 1];
    return stdDev === 0 ? 0 : (latest - mean) / stdDev;
  }

  private updatePriceHistory(price: number): void {
    this.priceHistory.push(price);
    if (this.priceHistory.length > this.rollingWindowSize * 2) {
      this.priceHistory.shift();
    }
  }

  private transitionTo(newState: SDTState): void {
    const oldState = this.currentState;
    this.currentState = newState;
    this.onStateChange?.(oldState, newState);
  }

  public getCurrentState(): SDTState {
    return this.currentState;
  }

  public getLastZScore(): number {
    return this.lastZScore;
  }

  public getLastMultiplier(): number {
    return this.lastMultiplier;
  }

  public reset(): void {
    this.transitionTo("G0_HOMEOSTASIS");
  }

  public forceDrawdown(): void {
    this.riskProfile.currentEquity =
      this.riskProfile.equityHighWaterMark * 0.94;
  }

  public injectShock(): void {
    const base =
      this.priceHistory.length > 0
        ? this.priceHistory[this.priceHistory.length - 1]
        : 100;
    for (let i = 0; i < 5; i++) {
      this.priceHistory.push(base + 15 + i);
    }
    if (this.priceHistory.length > this.rollingWindowSize * 2) {
      this.priceHistory = this.priceHistory.slice(-this.rollingWindowSize * 2);
    }
  }

  public resetEquity(): void {
    this.riskProfile.currentEquity = this.riskProfile.equityHighWaterMark;
    if (this.currentState === "P53_ARREST") {
      this.currentState = "G0_HOMEOSTASIS";
      this.transitionTo("G0_HOMEOSTASIS");
    }
  }
}