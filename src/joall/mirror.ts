export interface Kick {
  id: number;
  timestamp: number;
  price: number;
  movement: number;
}

export class JOALLMirror {
  private kicks: Kick[] = [];
  private lastPrice: number | null = null;
  private nextId = 1;

  public mirror(price: number, timestamp: number): Kick {
    let movement = 0;

    if (this.lastPrice !== null) {
      movement = Math.abs(price - this.lastPrice);
    }

    this.lastPrice = price;

    const kick: Kick = {
      id: this.nextId++,
      timestamp,
      price,
      movement,
    };

    this.kicks.push(kick);

    return kick;
  }

  public latest(): Kick | null {
    if (this.kicks.length === 0) return null;
    return this.kicks[this.kicks.length - 1];
  }

  public history(): Kick[] {
    return [...this.kicks];
  }

  public clear(): void {
    this.kicks = [];
    this.lastPrice = null;
    this.nextId = 1;
  }
}
