import type {
  ConfidenceFactor,
  ConfidenceGrade,
  ConfidenceOptions,
  ConfidenceResult,
} from "./types";

/**
 * Score a set of factors into a bounded confidence value + letter grade.
 * The algorithm is intentionally simple and inspectable so it can be
 * replaced later by a learned model without breaking callers.
 */
export function scoreConfidence(
  factors: readonly ConfidenceFactor[],
  options: ConfidenceOptions = {},
): ConfidenceResult {
  const gradeA = options.gradeAThreshold ?? 0.75;
  const minScore = options.minScore ?? 0;

  let positive = 0;
  let negative = 0;
  let importanceSum = 0;
  let weighted = 0;

  for (const f of factors) {
    const w = clamp(f.weight, -1, 1);
    const imp = Math.max(0, f.importance);
    weighted += w * imp;
    importanceSum += imp;
    if (w > 0) positive += w * imp;
    else negative += Math.abs(w) * imp;
  }

  const raw = importanceSum === 0 ? 0 : weighted / importanceSum; // [-1, 1]
  const normalized = Math.max(minScore, (raw + 1) / 2); // [0, 1]
  const grade = toGrade(normalized, gradeA);

  return {
    score: normalized,
    grade,
    positive,
    negative,
    factors: [...factors],
    rationale: buildRationale(normalized, grade, factors),
  };
}

function toGrade(score: number, gradeA: number): ConfidenceGrade {
  if (score >= gradeA) return "A";
  if (score >= gradeA - 0.15) return "B";
  if (score >= gradeA - 0.3) return "C";
  if (score >= gradeA - 0.45) return "D";
  return "F";
}

function buildRationale(
  score: number,
  grade: ConfidenceGrade,
  factors: readonly ConfidenceFactor[],
): string {
  const sorted = [...factors].sort(
    (a, b) => Math.abs(b.weight * b.importance) - Math.abs(a.weight * a.importance),
  );
  const top = sorted.slice(0, 3).map((f) => `${f.label} (${f.weight >= 0 ? "+" : ""}${f.weight.toFixed(2)})`);
  return `Grade ${grade} @ ${(score * 100).toFixed(0)}% — driven by ${top.join(", ") || "no factors"}.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
