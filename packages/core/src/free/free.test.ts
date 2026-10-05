import { describe, expect, it } from 'vitest';
import { ARGENTINA, BRASIL } from '../test-support';
import { freeReducer, freeStats, startFree, type FreeEvent, type FreeState } from './free';

function play(state: FreeState, ...events: FreeEvent[]): FreeState {
  return events.reduce(freeReducer, state);
}

describe('free mode', () => {
  it('selects a country', () => {
    expect(play(startFree(), { type: 'select', id: BRASIL }).selected).toBe(BRASIL);
  });

  it('lets the player change the selection before answering', () => {
    const state = play(startFree(), { type: 'select', id: BRASIL }, { type: 'select', id: ARGENTINA });

    expect(state.selected).toBe(ARGENTINA);
  });

  it('ignores ids that are not part of the quiz', () => {
    const state = startFree();

    expect(play(state, { type: 'select', id: -1 })).toBe(state);
  });

  it('records a correct answer and clears the selection', () => {
    const state = play(startFree(), { type: 'select', id: BRASIL }, { type: 'answer', text: ' Brazil ' });

    expect(state.selected).toBeNull();
    expect(state.answers.get(BRASIL)).toEqual({ correct: true, attempt: 'Brazil' });
  });

  it('records a wrong answer', () => {
    const state = play(startFree(), { type: 'select', id: BRASIL }, { type: 'answer', text: 'argentina' });

    expect(state.answers.get(BRASIL)).toEqual({ correct: false, attempt: 'argentina' });
  });

  it('gives a single attempt per country', () => {
    const answered = play(startFree(), { type: 'select', id: BRASIL }, { type: 'answer', text: 'peru' });

    expect(play(answered, { type: 'select', id: BRASIL })).toBe(answered);
  });

  it('ignores answers with nothing selected or nothing typed', () => {
    const idle = startFree();
    const selected = play(idle, { type: 'select', id: BRASIL });

    expect(play(idle, { type: 'answer', text: 'brasil' })).toBe(idle);
    expect(play(selected, { type: 'answer', text: '  ?! ' })).toBe(selected);
  });

  it('counts correct answers and attempts', () => {
    const state = play(
      startFree(),
      { type: 'select', id: BRASIL },
      { type: 'answer', text: 'brasil' },
      { type: 'select', id: ARGENTINA },
      { type: 'answer', text: 'chile' },
    );

    expect(freeStats(state)).toEqual({ correct: 1, total: 2 });
  });
});
