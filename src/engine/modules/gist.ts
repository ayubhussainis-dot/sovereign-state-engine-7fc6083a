/**
 * GIST
 *
 * Geometric / structural state layer.
 *
 * Converts market movement into deterministic structural measures:
 * - Price displacement
 * - Volume participation
 * - Movement efficiency
 * - Structural coherence
 *
 * It does NOT predict direction.
 * It does NOT place orders.
 * It does NOT replace PPG or SOALL.
 */

export interface GISTInput {
  priceChange: number;
  volume: number;
  averageVolume: number;
  priceVelocity: number;
  priceAcceleration: number;
}

export interface GISTState {
  displacement: number;
  participation: number;
  velocity: number;
  acceleration: number;
  movementEfficiency: number;
  structuralCoherence: number;
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export function evaluateGIST(
  input: GISTInput,
): GISTState {
  const displacement =
    clamp01(Math.abs(input.priceChange) / 100);

  const averageVolume =
    Math.max(0, input.averageVolume);

  const participation =
    averageVolume > 0
      ? clamp01(input.volume / averageVolume)
      : 0;

  const velocity =
    clamp01(Math.abs(input.priceVelocity) / 100);

  const acceleration =
    clamp01(Math.abs(input.priceAcceleration) / 100);

  const movementEfficiency = clamp01(
    displacement * 0.40 +
    participation * 0.30 +
    velocity * 0.20 +
    acceleration * 0.10,
  );

  const structuralCoherence = clamp01(
    movementEfficiency *
    (0.5 + 0.5 * participation),
  );

  return {
    displacement,
    participation,
    velocity,
    acceleration,
    movementEfficiency,
    structuralCoherence,
  };
}
