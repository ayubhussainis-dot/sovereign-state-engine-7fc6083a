export interface MC01State {
  tick: number;
  timestamp: number;

  bullish: number;
  bearish: number;
  neutral: number;

  jack: number;
  joker: number;

  momentum: number;
  pressure: number;
  strength: number;

  dominance: number;
  transition: number;
  confidence: number;
}

export class MC01StateEngine {
  private state: MC01State = {
    tick: 0,
    timestamp: 0,

    bullish: 0,
    bearish: 0,
    neutral: 100,

    jack: 0,
    joker: 0,

    momentum: 0,
    pressure: 0,
    strength: 0,

    dominance: 0,
    transition: 0,
    confidence: 0,
  };

  update(snapshot: unknown): MC01State {
    this.state.tick++;
    this.state.timestamp = Date.now();

    // Every calculator updates here.
    // Jack
    // Joker
    // Bullish
    // Bearish
    // Momentum
    // Pressure
    // Strength

    return this.state;
  }

  getState(): MC01State {
    return this.state;
  }
}
