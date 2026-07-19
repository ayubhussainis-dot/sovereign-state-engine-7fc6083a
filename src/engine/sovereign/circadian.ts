/**
 * Circadian modulator — slow sinusoidal aggression multiplier.
 * Value oscillates in [0, 1]; a Decision/Risk consumer can scale its
 * position sizing by this without altering the underlying signals.
 */
export function waveMultiplier(tick: number, period = 18): number {
  return 0.5 + 0.5 * Math.sin(tick / period);
}

export function circadianRegime(value: number): "dormant" | "waking" | "peak" {
  if (value < 0.25) return "dormant";
  if (value < 0.75) return "waking";
  return "peak";
}
