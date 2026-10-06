import {
  individualReducer,
  quizFor,
  startIndividual,
  type GameSetup,
  type IndividualEvent,
  type IndividualState,
} from '@contorno/core';
import { describe, expect, it } from 'vitest';
import { correctGuess, pickQuestions, required, wrongGuess } from '../../test-utils';
import { individualMapView } from './individualView';

const BRASIL = 76;
const ARGENTINA = 32;
const CHILE = 152;
const SAO_PAULO = 35;
const GOIAS = 52;

const perguntas: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const continentes: GameSetup = { mode: 'continentes', pool: { kind: 'continent', continent: 'oceania' } };
const localizar: GameSetup = { mode: 'localizar', pool: { kind: 'level', level: 1 } };
const cidades: GameSetup = { mode: 'brasil', pool: { kind: 'brasil', topic: 'cidades' } };
const estados: GameSetup = { mode: 'brasil', pool: { kind: 'brasil', topic: 'estados' } };

/** Plays a game over Brasil, Argentina and Chile, where each step answers the current question right or wrong. */
function play(setup: GameSetup, ...steps: ('right' | 'wrong' | 'give_up' | 'next')[]): IndividualState {
  const questions = pickQuestions(setup, [BRASIL, ARGENTINA, CHILE]);
  return run(startIndividual(questions), steps);
}

function run(initial: IndividualState, steps: ('right' | 'wrong' | 'give_up' | 'next')[]): IndividualState {
  return steps.reduce((state, step) => {
    const event: IndividualEvent =
      step === 'right' || step === 'wrong'
        ? {
            type: 'guess',
            guess: (step === 'right' ? correctGuess : wrongGuess)(required(state.questions[state.index])),
          }
        : { type: step };
    return individualReducer(state, event);
  }, initial);
}

const viewOf = (setup: GameSetup, state: IndividualState, flash = null) =>
  individualMapView(state, quizFor(setup), flash);

describe('typing modes', () => {
  it('light up the current region and zoom to it', () => {
    const view = viewOf(perguntas, play(perguntas));

    expect(view.tones.get(BRASIL)).toBe('target');
    expect(view.focus).toEqual({ kind: 'region', id: BRASIL });
  });

  it('paint settled questions green or red', () => {
    const view = viewOf(perguntas, play(perguntas, 'right', 'next', 'give_up', 'next'));

    expect(view.tones.get(BRASIL)).toBe('correct');
    expect(view.tones.get(ARGENTINA)).toBe('wrong');
    expect(view.tones.get(CHILE)).toBe('target');
  });

  it('show the settled color, not the target, while waiting for the next question', () => {
    expect(viewOf(perguntas, play(perguntas, 'right')).tones.get(BRASIL)).toBe('correct');
  });

  it('frame the whole continent in Continentes', () => {
    const oceania = quizFor(continentes);
    const state = startIndividual(oceania.questions);

    expect(individualMapView(state, oceania, null).focus).toEqual({ kind: 'regions', ids: [36, 242, 554, 598] });
  });

  it('follow each Brazilian state on its own map', () => {
    const state = startIndividual(pickQuestions(estados, [SAO_PAULO, GOIAS]));

    expect(individualMapView(state, quizFor(estados), null)).toMatchObject({
      focus: { kind: 'region', id: SAO_PAULO },
      tones: new Map([[SAO_PAULO, 'target']]),
    });
  });
});

describe('locating mode', () => {
  it('hides the answer and frames the whole map while asking', () => {
    const view = viewOf(localizar, play(localizar, 'wrong'));

    expect(view.tones.has(BRASIL)).toBe(false);
    expect(view.focus).toEqual({ kind: 'world' });
  });

  it('zooms to the answer once settled', () => {
    const view = viewOf(localizar, play(localizar, 'right'));

    expect(view.tones.get(BRASIL)).toBe('correct');
    expect(view.focus).toEqual({ kind: 'region', id: BRASIL });
  });

  it('reveals the answer in gold when the player gives up, then paints it red', () => {
    expect(viewOf(localizar, play(localizar, 'give_up')).tones.get(BRASIL)).toBe('target');
    expect(viewOf(localizar, play(localizar, 'give_up', 'next')).tones.get(BRASIL)).toBe('wrong');
  });

  it('shows the state of a Brazilian city once settled', () => {
    const state = startIndividual(pickQuestions(cidades, [SAO_PAULO]));
    const settled = run(state, ['right']);

    expect(viewOf(cidades, settled).focus).toEqual({ kind: 'region', id: SAO_PAULO });
    expect(viewOf(cidades, settled).tones.get(SAO_PAULO)).toBe('correct');
  });
});

describe('locating where regions repeat (Brazilian cities)', () => {
  // Two cities of the same state, then one of another.
  const twoInSaoPaulo = () => {
    const [first, second] = quizFor(cidades).questions.filter((question) => question.regionId === SAO_PAULO);
    return [required(first), required(second)];
  };
  const play3 = (...steps: ('right' | 'wrong' | 'give_up' | 'next')[]) =>
    run(startIndividual([...twoInSaoPaulo(), ...pickQuestions(cidades, [GOIAS])]), steps);

  it('paints a failed state red while the answer is on screen, then clears it', () => {
    const failed = play3('wrong', 'wrong', 'wrong');
    expect(viewOf(cidades, failed).tones.get(SAO_PAULO)).toBe('wrong');

    const nextCity = play3('wrong', 'wrong', 'wrong', 'next');
    expect(viewOf(cidades, nextCity).tones.has(SAO_PAULO)).toBe(false);
  });

  it('clears a revealed (given-up) state once the next city comes', () => {
    expect(viewOf(cidades, play3('give_up')).tones.get(SAO_PAULO)).toBe('target');
    expect(viewOf(cidades, play3('give_up', 'next')).tones.has(SAO_PAULO)).toBe(false);
  });

  it('keeps a correctly found state painted green', () => {
    expect(viewOf(cidades, play3('right', 'next')).tones.get(SAO_PAULO)).toBe('correct');
  });

  it('still paints a miss permanently where each region is asked once', () => {
    expect(viewOf(localizar, play(localizar, 'give_up', 'next')).tones.get(BRASIL)).toBe('wrong');
  });
});

describe('flash', () => {
  it('overrides the tone of its region', () => {
    const view = individualMapView(play(perguntas), quizFor(perguntas), { regionId: BRASIL, tone: 'wrong' });

    expect(view.tones.get(BRASIL)).toBe('wrong');
  });
});
