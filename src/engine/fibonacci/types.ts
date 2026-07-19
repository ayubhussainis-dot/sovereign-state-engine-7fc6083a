/**
 * Fibonacci / OTE Engine — Types
 *
 * Retracements, extensions, and the ICT-flavoured Optimal Trade Entry
 * (OTE) zone (0.62–0.79 of the leg). Pure, deterministic.
 */

export type FibDirection = "up" | "down";

export interface FibLeg {
  /** Anchor price at leg start. */
  start: number;
  /** Anchor price at leg end (the swing point being retraced). */
  end: number;
  direction: FibDirection;
  startTime?: number;
  endTime?: number;
}

export interface FibLevel {
  ratio: number;
  price: number;
  label: string;
}

export interface FibOTE {
  low: number;
  high: number;
  midpoint: number;
  ratioLow: number;
  ratioHigh: number;
}

export interface FibAnalysis {
  leg: FibLeg;
  retracements: FibLevel[];
  extensions: FibLevel[];
  ote: FibOTE;
  equilibrium: number;
}

export interface FibOptions {
  retracements?: number[];
  extensions?: number[];
  ote?: { low: number; high: number };
}
