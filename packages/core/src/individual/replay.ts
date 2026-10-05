import type { Question } from '../quiz/question';
import { individualReducer, startIndividual, type IndividualEvent, type IndividualState } from './individual';

export type ReplayResult =
  { readonly ok: true; readonly state: IndividualState } | { readonly ok: false; readonly reason: string };

/**
 * Plays a recorded solo game again to learn how it really went, so a score can be checked instead of trusted.
 * Fails on any event the game would have ignored, and unless the game ran to its end.
 */
export function replayIndividual(questions: readonly Question[], events: readonly IndividualEvent[]): ReplayResult {
  let state = startIndividual(questions);
  for (const [index, event] of events.entries()) {
    const next = individualReducer(state, event);
    if (next === state) return { ok: false, reason: `Event ${String(index)} (${event.type}) is not valid here` };
    state = next;
  }
  return state.status === 'finished' ? { ok: true, state } : { ok: false, reason: 'The game did not finish' };
}
