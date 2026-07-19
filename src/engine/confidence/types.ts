/**
 * AI Confidence Scoring — Types
 *
 * Deterministic, explainable scoring layer. Every factor contributes a
 * bounded signed weight; the aggregate is normalized to [0, 1] and
 * accompanied by a per-factor breakdown for transparency.
 */

export type ConfidenceGrade = "A" | "B" | "C" | "D" | "F";

export interface ConfidenceFactor {
  id: string;
  label: string;
  /** Signed weight in [-1, 1]; positive supports the thesis. */
  weight: number;
  /** How heavily this factor is trusted in the final aggregation. */
  importance: number;
  note?: string;
}

export interface ConfidenceOptions {
  /** Minimum importance-adjusted score to grade A. Defaults 0.75. */
  gradeAThreshold?: number;
  /** Force grading floor even when factors are missing. Defaults 0.0. */
  minScore?: number;
}

export interface ConfidenceResult {
  score: number;
  grade: ConfidenceGrade;
  positive: number;
  negative: number;
  factors: ConfidenceFactor[];
  rationale: string;
}
