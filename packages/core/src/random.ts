/** Source of randomness in [0, 1), injected so game setup stays deterministic under test. */
export type Random = () => number;

/** Fisher-Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }
  return shuffled;
}
