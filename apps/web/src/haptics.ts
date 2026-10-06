/** Short buzzes for taps and answers; silently nothing where the device (or browser) cannot vibrate. */
export const HAPTICS = {
  tap: 8,
  press: 15,
  right: 20,
  wrong: [30, 40, 30],
} as const;

export function vibrate(pattern: number | readonly number[]): void {
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    // Vibrating is a nicety (some browsers refuse it without a recent tap); never worth failing for.
  }
}
