import { describe, expect, it } from 'vitest';
import { ARGENTINA, BRASIL, CHILE, clicked, seededRandom, typed } from '../test-support';
import {
  currentIndividualCountryId,
  currentIndividualPoints,
  individualReducer,
  selectIndividualQuestions,
  startIndividual,
  type IndividualEvent,
  type IndividualState,
} from './individual';

function play(state: IndividualState, ...events: IndividualEvent[]): IndividualState {
  return events.reduce(individualReducer, state);
}

const start = () => startIndividual([BRASIL, ARGENTINA, CHILE]);

describe('individual game', () => {
  it('scores full points for a first-try answer', () => {
    const state = play(start(), { type: 'guess', guess: typed('brasil') });

    expect(state).toMatchObject({ score: 2000, status: 'resolved' });
    expect(state.results).toEqual([{ countryId: BRASIL, outcome: 'correct', wrongs: 0, points: 2000 }]);
  });

  it('takes 200 points off per wrong guess', () => {
    const wrong = { type: 'guess', guess: typed('peru') } as const;
    const state = play(start(), wrong, wrong);

    expect(state).toMatchObject({ status: 'asking', wrongs: 2 });
    expect(currentIndividualPoints(state)).toBe(1600);
    expect(play(state, { type: 'guess', guess: typed('brasil') }).score).toBe(1600);
  });

  it('fails the question after three wrong guesses', () => {
    const wrong = { type: 'guess', guess: typed('peru') } as const;
    const state = play(start(), wrong, wrong, wrong);

    expect(state).toMatchObject({ score: 0, status: 'resolved' });
    expect(state.results[0]).toMatchObject({ outcome: 'failed', wrongs: 3, points: 0 });
  });

  it('records a give up with no points', () => {
    const state = play(start(), { type: 'give_up' });

    expect(state.results[0]).toMatchObject({ outcome: 'gave_up', points: 0 });
  });

  it('accepts clicked countries as guesses', () => {
    expect(play(start(), { type: 'guess', guess: clicked(BRASIL) }).score).toBe(2000);
    expect(play(start(), { type: 'guess', guess: clicked(CHILE) }).wrongs).toBe(1);
  });

  it('ignores guesses while the question is settled', () => {
    const settled = play(start(), { type: 'guess', guess: typed('brasil') });

    expect(play(settled, { type: 'guess', guess: typed('brasil') })).toBe(settled);
    expect(play(settled, { type: 'give_up' })).toBe(settled);
  });

  it('only advances once the question is settled', () => {
    const asking = start();
    const next = play(asking, { type: 'guess', guess: typed('brasil') }, { type: 'next' });

    expect(play(asking, { type: 'next' })).toBe(asking);
    expect(currentIndividualCountryId(next)).toBe(ARGENTINA);
    expect(next).toMatchObject({ index: 1, wrongs: 0, status: 'asking', score: 2000 });
  });

  it('finishes after the last question', () => {
    const answerAndNext = (name: string): IndividualEvent[] => [
      { type: 'guess', guess: typed(name) },
      { type: 'next' },
    ];
    const state = play(start(), ...answerAndNext('brasil'), ...answerAndNext('argentina'), ...answerAndNext('chile'));

    expect(state).toMatchObject({ status: 'finished', score: 6000 });
    expect(state.results).toHaveLength(3);
  });

  it('refuses to start without questions', () => {
    expect(() => startIndividual([])).toThrow();
  });
});

describe('selectIndividualQuestions', () => {
  it('samples 10 countries from a level pool', () => {
    const ids = selectIndividualQuestions({ kind: 'level', level: 1 }, seededRandom(3));

    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });

  it('plays a whole continent', () => {
    const ids = selectIndividualQuestions({ kind: 'continent', continent: 'south-america' }, seededRandom(3));

    expect([...ids].sort((a, b) => a - b)).toEqual([32, 68, 76, 152, 170, 218, 254, 328, 600, 604, 740, 780, 858, 862]);
  });
});
