import type { DuelResolution } from './duel';

/** How long a resolved question stays on screen before the duel moves on; shared by local and online play. */
export function duelResolutionDelayMs(resolution: DuelResolution): number {
  switch (resolution.kind) {
    case 'scored':
      return 1600;
    case 'tiebreak_first_answered':
      return 1500;
    default:
      return 2000;
  }
}
