/**
 * 7777 Convergence — 4-way z-score alignment detector.
 *
 * A rolling-window z-score utility plus the convergence rule: fires when
 * |priceZ|, |volumeZ|, |timeZ|, |volatilityZ| all exceed a threshold
 * (default 2.5). Additive signal — not a replacement for HETIS's
 * Confluence/MTF scanners.
 */

export interface RollingSample {
  push(value: number): void;
  mean(): number;
  std(): number;
  z(value: number): number;
  size: number;
  count(): number;
}

export function createRolling(size: number): RollingSample {
  const buf: number[] = [];
  return {
    size,
    push(value) {
      buf.push(value);
      if (buf.length > size) buf.shift();
    },
    count() {
      return buf.length;
    },
    mean() {
      if (buf.length === 0) return 0;
      let s = 0;
      for (const v of buf) s += v;
      return s / buf.length;
    },
    std() {
      if (buf.length < 2) return 0;
      const m = this.mean();
      let s = 0;
      for (const v of buf) s += (v - m) ** 2;
      return Math.sqrt(s / (buf.length - 1));
    },
    z(value) {
      const sd = this.std();
      if (sd === 0) return 0;
      return (value - this.mean()) / sd;
    },
  };
}

export interface ConvergenceReading {
  priceZ: number;
  volumeZ: number;
  timeZ: number;
  volatilityZ: number;
  convergent: boolean;
  strength: number;
}

export function evaluateConvergence(
  reading: Omit<ConvergenceReading, "convergent" | "strength">,
  threshold = 2.5,
): ConvergenceReading {
  const zs = [reading.priceZ, reading.volumeZ, reading.timeZ, reading.volatilityZ];
  const convergent = zs.every((z) => Math.abs(z) > threshold);
  const strength = zs.reduce((s, z) => s + Math.abs(z), 0) / zs.length;
  return { ...reading, convergent, strength };
}
