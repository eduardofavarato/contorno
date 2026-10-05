import { describe, expect, it } from 'vitest';
import { ARGENTINA, BRASIL, CHILE, typed, typedQuestion } from '../test-support';
import { duelReducer, startDuel } from './duel';
import { duelResolutionDelayMs } from './timing';
import { toDuelView } from './view';

const start = () =>
  startDuel({ questions: [BRASIL, ARGENTINA].map(typedQuestion), tiebreakOrder: [CHILE].map(typedQuestion) });

describe('toDuelView', () => {
  it('describes the open question without exposing the upcoming ones', () => {
    const view = toDuelView(start());

    expect(view).toMatchObject({
      stage: 'primary',
      status: 'asking',
      round: 0,
      questionCount: 2,
      question: { id: BRASIL, regionId: BRASIL, prompt: null },
      answer: null,
      activePlayer: 0,
      canGiveUp: true,
      points: 2000,
      scores: [0, 0],
      winner: null,
    });
    expect(view).not.toHaveProperty('questions');
    expect(view).not.toHaveProperty('tiebreakOrder');
  });

  it('reveals the answer only once nobody else has to give it', () => {
    const play = (...events: Parameters<typeof duelReducer>[1][]) => toDuelView(events.reduce(duelReducer, start()));
    const guess = (player: 0 | 1, value: string) => ({ type: 'guess', player, guess: typed(value) }) as const;

    expect(play().answer).toBeNull();
    expect(play(guess(0, 'brasil')).answer).toBe('Brasil');
    expect(play(guess(0, 'peru')).answer).toBeNull();
    expect(play(guess(0, 'peru'), { type: 'next' }, guess(1, 'peru')).answer).toBe('Brasil');
  });

  it('follows the duel through a steal', () => {
    const failed = duelReducer(start(), { type: 'guess', player: 0, guess: typed('peru') });
    const steal = duelReducer(failed, { type: 'next' });
    const view = toDuelView(steal);

    expect(view).toMatchObject({
      stage: 'steal',
      activePlayer: 1,
      canGiveUp: false,
      points: 1000,
      question: { regionId: BRASIL },
    });
  });

  it('has no country once finished', () => {
    const finished = [
      { type: 'guess', player: 0, guess: typed('brasil') },
      { type: 'next' },
      { type: 'guess', player: 1, guess: typed('peru') },
      { type: 'next' },
      { type: 'guess', player: 0, guess: typed('argentina') },
      { type: 'next' },
    ] as const;
    const view = toDuelView(finished.reduce(duelReducer, start()));

    expect(view).toMatchObject({ status: 'finished', question: null, answer: null, winner: 0 });
  });
});

describe('duelResolutionDelayMs', () => {
  it('is quick for points and longer for misses', () => {
    expect(duelResolutionDelayMs({ kind: 'scored', player: 0, points: 2000, stolen: false })).toBe(1600);
    expect(duelResolutionDelayMs({ kind: 'tiebreak_first_answered', correct: true })).toBe(1500);
    expect(duelResolutionDelayMs({ kind: 'nobody_scored' })).toBe(2000);
  });
});
