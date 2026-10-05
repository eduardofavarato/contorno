import { describe, expect, it } from 'vitest';
import { BRASIL, ARGENTINA, typedQuestion } from '../test-support';
import type { IndividualEvent } from './individual';
import { replayIndividual } from './replay';

const questions = [BRASIL, ARGENTINA].map(typedQuestion);
const guess = (value: string): IndividualEvent => ({ type: 'guess', guess: { type: 'text', value } });
const next: IndividualEvent = { type: 'next' };

describe('replayIndividual', () => {
  it('rebuilds the final state of a recorded game', () => {
    const result = replayIndividual(questions, [guess('brasil'), next, guess('peru'), guess('argentina'), next]);

    expect(result).toMatchObject({ ok: true, state: { status: 'finished', score: 2000 + 1800 } });
  });

  it('counts gave-up and failed questions as they were', () => {
    const result = replayIndividual(questions, [{ type: 'give_up' }, next, guess('x'), guess('y'), guess('z'), next]);

    expect(result).toMatchObject({ ok: true, state: { score: 0 } });
  });

  it('rejects an event the game would have ignored', () => {
    // `next` before the question was settled.
    expect(replayIndividual(questions, [next])).toMatchObject({ ok: false });
    // A guess after the question was settled.
    expect(replayIndividual(questions, [guess('brasil'), guess('brasil')])).toMatchObject({ ok: false });
  });

  it('rejects a game that did not finish', () => {
    expect(replayIndividual(questions, [guess('brasil'), next])).toMatchObject({ ok: false });
    expect(replayIndividual(questions, [])).toMatchObject({ ok: false });
  });

  it('rejects events after the game ended', () => {
    const finished: IndividualEvent[] = [guess('brasil'), next, guess('argentina'), next];

    expect(replayIndividual(questions, [...finished, next])).toMatchObject({ ok: false });
  });
});
