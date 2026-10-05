import { describe, expect, it } from 'vitest';
import { quizFor } from '../quiz/quiz';
import { ARGENTINA, BRASIL, CHILE, seededRandom, typed, typedQuestion } from '../test-support';
import {
  activePlayer,
  canGiveUp,
  currentDuelQuestion,
  currentDuelPoints,
  duelReducer,
  selectDuelSetup,
  startDuel,
  type DuelEvent,
  type DuelState,
  type PlayerIndex,
} from './duel';

const URUGUAI = 858;
const regionOf = (state: DuelState) => currentDuelQuestion(state).regionId;

function play(state: DuelState, ...events: DuelEvent[]): DuelState {
  return events.reduce(duelReducer, state);
}

const answer = (player: PlayerIndex, value: string): DuelEvent => ({ type: 'guess', player, guess: typed(value) });
const next: DuelEvent = { type: 'next' };

/** Two main questions (Brasil, Argentina) and a tiebreak queue (Chile, Uruguai). */
const start = () =>
  startDuel({ questions: [BRASIL, ARGENTINA].map(typedQuestion), tiebreakOrder: [CHILE, URUGUAI].map(typedQuestion) });

/** Both questions answered by their turn owner: 2000 each, tied, tiebreak about to start. */
const tiedAtTiebreak = () => play(start(), answer(0, 'brasil'), next, answer(1, 'argentina'), next);

describe('main rounds', () => {
  it('gives the turn owner 2000 points for a correct answer', () => {
    const state = play(start(), answer(0, 'brasil'));

    expect(state.scores).toEqual([2000, 0]);
    expect(state.resolution).toEqual({ kind: 'scored', player: 0, points: 2000, stolen: false });
    expect(state.results).toEqual([
      {
        question: { id: BRASIL, regionId: BRASIL, prompt: null, subject: 'Brasil', answer: 'Brasil' },
        player: 0,
        points: 2000,
        stolen: false,
      },
    ]);
  });

  it('alternates who opens each question', () => {
    const second = play(start(), answer(0, 'brasil'), next);

    expect(activePlayer(second)).toBe(1);
    expect(regionOf(second)).toBe(ARGENTINA);
  });

  it('offers a steal worth 1000 after a wrong answer', () => {
    const failed = play(start(), answer(0, 'peru'));
    expect(failed.resolution).toEqual({ kind: 'primary_failed', gaveUp: false });

    const steal = play(failed, next);
    expect(steal).toMatchObject({ stage: 'steal', status: 'asking' });
    expect(activePlayer(steal)).toBe(1);
    expect(currentDuelPoints(steal)).toBe(1000);
    expect(regionOf(steal)).toBe(BRASIL);

    const stolen = play(steal, answer(1, 'brasil'));
    expect(stolen.scores).toEqual([0, 1000]);
    expect(stolen.results[0]).toEqual({
      question: { id: BRASIL, regionId: BRASIL, prompt: null, subject: 'Brasil', answer: 'Brasil' },
      player: 1,
      points: 1000,
      stolen: true,
    });
  });

  it('gives nobody points when the steal fails too', () => {
    const state = play(start(), answer(0, 'peru'), next, answer(1, 'peru'));

    expect(state.resolution).toEqual({ kind: 'nobody_scored' });
    expect(state.scores).toEqual([0, 0]);
    expect(state.results[0]).toEqual({
      question: { id: BRASIL, regionId: BRASIL, prompt: null, subject: 'Brasil', answer: 'Brasil' },
      player: null,
      points: 0,
      stolen: false,
    });
  });

  it('lets only the turn owner give up, handing the steal to the rival', () => {
    const asking = start();
    expect(play(asking, { type: 'give_up', player: 1 })).toBe(asking);

    const gaveUp = play(asking, { type: 'give_up', player: 0 });
    expect(gaveUp.resolution).toEqual({ kind: 'primary_failed', gaveUp: true });
    expect(activePlayer(play(gaveUp, next))).toBe(1);
  });

  it('does not allow giving up on a steal', () => {
    const steal = play(start(), answer(0, 'peru'), next);

    expect(canGiveUp(steal)).toBe(false);
    expect(play(steal, { type: 'give_up', player: 1 })).toBe(steal);
  });

  it('ignores answers from the player whose turn it is not', () => {
    const asking = start();

    expect(play(asking, answer(1, 'brasil'))).toBe(asking);
  });

  it('ignores answers while the question is settled', () => {
    const settled = play(start(), answer(0, 'brasil'));

    expect(play(settled, answer(0, 'brasil'))).toBe(settled);
  });

  it('only advances once the question is settled', () => {
    const asking = start();

    expect(play(asking, next)).toBe(asking);
  });

  it('finishes with the higher score and no tiebreak', () => {
    const state = play(start(), answer(0, 'brasil'), next, answer(1, 'peru'), next, answer(0, 'argentina'), next);

    expect(state).toMatchObject({ status: 'finished', winner: 0, scores: [3000, 0] });
  });
});

describe('Rodada de Fogo', () => {
  it('starts when the scores are tied, with player A answering first', () => {
    const state = tiedAtTiebreak();

    expect(state).toMatchObject({ status: 'asking', stage: 'tiebreak-first', winner: null });
    expect(activePlayer(state)).toBe(0);
    expect(regionOf(state)).toBe(CHILE);
    expect(currentDuelPoints(state)).toBe(2000);
  });

  it('does not allow giving up', () => {
    expect(canGiveUp(tiedAtTiebreak())).toBe(false);
  });

  it('gives player B the same country after A answers', () => {
    const second = play(tiedAtTiebreak(), answer(0, 'chile'), next);

    expect(second).toMatchObject({ stage: 'tiebreak-second', status: 'asking' });
    expect(activePlayer(second)).toBe(1);
    expect(regionOf(second)).toBe(CHILE);
  });

  it('is won by the player who got it right when only one did', () => {
    const aWins = play(tiedAtTiebreak(), answer(0, 'chile'), next, answer(1, 'peru'), next);
    const bWins = play(tiedAtTiebreak(), answer(0, 'peru'), next, answer(1, 'chile'), next);

    expect(aWins).toMatchObject({ status: 'finished', winner: 0 });
    expect(bWins).toMatchObject({ status: 'finished', winner: 1 });
  });

  it('moves to the next country when both get it right or both miss', () => {
    const bothRight = play(tiedAtTiebreak(), answer(0, 'chile'), next, answer(1, 'chile'));
    expect(bothRight.resolution).toEqual({ kind: 'tiebreak_replay', bothCorrect: true });

    const bothWrong = play(tiedAtTiebreak(), answer(0, 'peru'), next, answer(1, 'peru'), next);
    expect(bothWrong).toMatchObject({ stage: 'tiebreak-first', status: 'asking' });
    expect(regionOf(bothWrong)).toBe(URUGUAI);
    expect(activePlayer(bothWrong)).toBe(0);
  });

  it('replays the tiebreak countries from the start when the tie outlasts them', () => {
    const miss = [answer(0, 'peru'), next, answer(1, 'peru'), next];
    const state = play(tiedAtTiebreak(), ...miss, ...miss);

    expect(regionOf(state)).toBe(CHILE);
    expect(state.tiebreakRound).toBe(2);
  });

  it('never scores points', () => {
    const state = play(tiedAtTiebreak(), answer(0, 'chile'), next);

    expect(state.scores).toEqual([2000, 2000]);
    expect(state.results).toHaveLength(2);
  });
});

describe('setup', () => {
  it('refuses to start without questions or tiebreak countries', () => {
    expect(() => startDuel({ questions: [], tiebreakOrder: [typedQuestion(BRASIL)] })).toThrow();
    expect(() => startDuel({ questions: [typedQuestion(BRASIL)], tiebreakOrder: [] })).toThrow();
  });

  it('samples 10 questions and keeps the rest of the quiz for the tiebreak', () => {
    const setup = selectDuelSetup(quizFor({ mode: 'perguntas', pool: { kind: 'level', level: 1 } }), seededRandom(5));
    const ids = [...setup.questions, ...setup.tiebreakOrder].map((question) => question.id);

    expect(setup.questions).toHaveLength(10);
    expect(setup.tiebreakOrder).toHaveLength(40);
    expect(new Set(ids).size).toBe(50);
  });

  it('uses the whole continent when it has fewer than 10 countries and replays it for the tiebreak', () => {
    const quiz = quizFor({ mode: 'continentes', pool: { kind: 'continent', continent: 'oceania' } });
    const setup = selectDuelSetup(quiz, seededRandom(5));
    const ids = (questions: typeof setup.questions) => questions.map((question) => question.id).sort((a, b) => a - b);

    expect(setup.questions).toHaveLength(4);
    expect(ids(setup.tiebreakOrder)).toEqual(ids(setup.questions));
  });

  it('keeps asked questions out of the tiebreak queue', () => {
    const quiz = quizFor({ mode: 'continentes', pool: { kind: 'continent', continent: 'south-america' } });
    const setup = selectDuelSetup(quiz, seededRandom(9));
    const asked = new Set(setup.questions.map((question) => question.id));

    expect(setup.tiebreakOrder.filter((question) => asked.has(question.id))).toEqual([]);
    expect(setup.questions.length + setup.tiebreakOrder.length).toBe(14);
  });
});
