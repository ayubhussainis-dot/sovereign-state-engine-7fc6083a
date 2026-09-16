/**
 * MAIC
 *
 * Market-Adversarial Intelligence / Cavitation layer.
 *
 * Detects structural conditions that can indicate:
 * - Liquidity withdrawal
 * - Abnormal order-book imbalance
 * - Price movement unsupported by available depth
 * - Potential market "cavitation"
 *
 * This module observes market structure.
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

export interface MAICInput {
  bidDepth: number;
  askDepth: number;
  spread: number;
  priceVelocity: number;
  volume: number;
  averageVolume: number;
}

export interface MAICState {
  depthImbalance: number;
  liquidityStress: number;
  spreadStress: number;
  velocityStress: number;
  volumeShock: number;
  cavitationScore: number;
  cavitation: boolean;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateMAIC(
  input: MAICInput,
): MAICState {
  const bidDepth = Math.max(0, input.bidDepth);
  const askDepth = Math.max(0, input.askDepth);

  const totalDepth = bidDepth + askDepth;

  const depthImbalance =
    totalDepth > 0
      ? Math.abs(bidDepth - askDepth) / totalDepth
      : 1;

  const liquidityStress =
    totalDepth > 0
      ? clamp01(1 - Math.min(totalDepth, 1))
      : 1;

  const spreadStress =
    clamp01(Math.max(0, input.spread) / 100);

  const velocityStress =
    clamp01(Math.abs(input.priceVelocity) / 100);

  const averageVolume =
    Math.max(0, input.averageVolume);

  const volumeShock =
    averageVolume > 0
      ? clamp01(
          Math.abs(input.volume - averageVolume) /
          averageVolume,
        )
      : 0;

  const cavitationScore = clamp01(
    depthImbalance * 0.25 +
    liquidityStress * 0.30 +
    spreadStress * 0.15 +
    velocityStress * 0.15 +
    volumeShock * 0.15,
  );

  return {
    depthImbalance,
    liquidityStress,
    spreadStress,
    velocityStress,
    volumeShock,
    cavitationScore,
    cavitation: cavitationScore >= 0.70,
  };
}
