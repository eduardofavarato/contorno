import {
  individualReducer,
  startIndividual,
  type GameSetup,
  type IndividualEvent,
  type IndividualState,
} from '@contorno/core';
import { describe, expect, it } from 'vitest';
import { individualMapView } from './individualView';

const BRASIL = 76;
const ARGENTINA = 32;
const CHILE = 152;

const perguntas: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const continentes: GameSetup = { mode: 'continentes', pool: { kind: 'continent', continent: 'oceania' } };
const localizar: GameSetup = { mode: 'localizar', pool: { kind: 'level', level: 1 } };

function play(...events: IndividualEvent[]): IndividualState {
  return events.reduce(individualReducer, startIndividual([BRASIL, ARGENTINA, CHILE]));
}

const right = { type: 'guess', guess: { type: 'country', id: BRASIL } } as const;
const wrong = { type: 'guess', guess: { type: 'country', id: CHILE } } as const;
const giveUp = { type: 'give_up' } as const;
const next = { type: 'next' } as const;

describe('typing modes', () => {
  it('light up the current country and zoom to it', () => {
    const view = individualMapView(play(), perguntas, null);

    expect(view.tones.get(BRASIL)).toBe('target');
    expect(view.focus).toEqual({ kind: 'country', id: BRASIL });
  });

  it('paint settled questions green or red', () => {
    const view = individualMapView(play(right, next, giveUp, next), perguntas, null);

    expect(view.tones.get(BRASIL)).toBe('correct');
    expect(view.tones.get(ARGENTINA)).toBe('wrong');
    expect(view.tones.get(CHILE)).toBe('target');
  });

  it('show the settled color, not the target, while waiting for the next question', () => {
    expect(individualMapView(play(right), perguntas, null).tones.get(BRASIL)).toBe('correct');
  });

  it('frame the whole continent in Continentes', () => {
    const view = individualMapView(play(), continentes, null);

    expect(view.focus).toEqual({ kind: 'countries', ids: [36, 242, 554, 598] });
  });
});

describe('locating mode', () => {
  it('hides the answer and frames the world while asking', () => {
    const view = individualMapView(play(wrong), localizar, null);

    expect(view.tones.has(BRASIL)).toBe(false);
    expect(view.focus).toEqual({ kind: 'world' });
  });

  it('zooms to the answer once settled', () => {
    const view = individualMapView(play(right), localizar, null);

    expect(view.tones.get(BRASIL)).toBe('correct');
    expect(view.focus).toEqual({ kind: 'country', id: BRASIL });
  });

  it('reveals the answer in gold when the player gives up, then paints it red', () => {
    expect(individualMapView(play(giveUp), localizar, null).tones.get(BRASIL)).toBe('target');
    expect(individualMapView(play(giveUp, next), localizar, null).tones.get(BRASIL)).toBe('wrong');
  });
});

describe('flash', () => {
  it('overrides the tone of its country', () => {
    const view = individualMapView(play(), perguntas, { countryId: BRASIL, tone: 'wrong' });

    expect(view.tones.get(BRASIL)).toBe('wrong');
  });
});
