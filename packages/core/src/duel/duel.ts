import { getCountry } from '../countries/catalog';
import { isCorrectGuess, type Guess } from '../countries/guess';
import type { CountryId } from '../countries/types';
import { resolvePool, type Pool } from '../pool/pool';
import { shuffle, type Random } from '../random';
import { MAX_POINTS, QUESTIONS_PER_GAME, STEAL_POINTS } from '../scoring';

export type PlayerIndex = 0 | 1;

/**
 * `primary`: the turn's owner answers. `steal`: the rival gets one shot after a miss.
 * `tiebreak-first` / `tiebreak-second`: Rodada de Fogo, both players answer the same country.
 */
export type DuelStage = 'primary' | 'steal' | 'tiebreak-first' | 'tiebreak-second';

/** What just happened to the current question; `next` moves on from it. */
export type DuelResolution =
  | { readonly kind: 'scored'; readonly player: PlayerIndex; readonly points: number; readonly stolen: boolean }
  | { readonly kind: 'primary_failed'; readonly gaveUp: boolean }
  | { readonly kind: 'nobody_scored' }
  | { readonly kind: 'tiebreak_first_answered'; readonly correct: boolean }
  | { readonly kind: 'tiebreak_replay'; readonly bothCorrect: boolean }
  | { readonly kind: 'tiebreak_decided'; readonly winner: PlayerIndex };

export interface DuelResult {
  readonly countryId: CountryId;
  /** Who scored it; `null` when nobody did. */
  readonly player: PlayerIndex | null;
  readonly points: number;
  readonly stolen: boolean;
}

export interface DuelState {
  readonly questions: readonly CountryId[];
  /** Countries for the Rodada de Fogo; replayed from the start if the tie outlasts them. */
  readonly tiebreakOrder: readonly CountryId[];
  readonly round: number;
  readonly tiebreakRound: number;
  readonly stage: DuelStage;
  readonly status: 'asking' | 'resolved' | 'finished';
  /** Set only while `status` is `resolved`. */
  readonly resolution: DuelResolution | null;
  /** In the Rodada de Fogo: whether player A got the country right, once A has answered. */
  readonly tiebreakFirstCorrect: boolean | null;
  readonly scores: readonly [number, number];
  readonly results: readonly DuelResult[];
  readonly winner: PlayerIndex | null;
}

export type DuelEvent =
  | { readonly type: 'guess'; readonly player: PlayerIndex; readonly guess: Guess }
  | { readonly type: 'give_up'; readonly player: PlayerIndex }
  | { readonly type: 'next' };

export interface DuelSetup {
  readonly questions: readonly CountryId[];
  readonly tiebreakOrder: readonly CountryId[];
}

/**
 * Main questions are sampled from the pool; the leftovers feed the Rodada de Fogo.
 * If the pool has no leftovers (small continents) the tiebreak replays the main questions.
 */
export function selectDuelSetup(pool: Pool, random: Random): DuelSetup {
  const ids = shuffle(resolvePool(pool), random).map((country) => country.id);
  const questions = ids.slice(0, QUESTIONS_PER_GAME);
  const leftovers = ids.slice(QUESTIONS_PER_GAME);
  return { questions, tiebreakOrder: leftovers.length > 0 ? leftovers : shuffle(questions, random) };
}

export function startDuel({ questions, tiebreakOrder }: DuelSetup): DuelState {
  if (questions.length === 0) throw new Error('A duel needs at least one question');
  if (tiebreakOrder.length === 0) throw new Error('A duel needs at least one tiebreak country');
  return {
    questions,
    tiebreakOrder,
    round: 0,
    tiebreakRound: 0,
    stage: 'primary',
    status: 'asking',
    resolution: null,
    tiebreakFirstCorrect: null,
    scores: [0, 0],
    results: [],
    winner: null,
  };
}

/** Turns alternate: player A opens the even rounds, player B the odd ones. */
function turnOwner(round: number): PlayerIndex {
  return round % 2 === 0 ? 0 : 1;
}

function rival(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

function isTiebreak(stage: DuelStage): boolean {
  return stage === 'tiebreak-first' || stage === 'tiebreak-second';
}

export function activePlayer(state: DuelState): PlayerIndex {
  switch (state.stage) {
    case 'primary':
      return turnOwner(state.round);
    case 'steal':
      return rival(turnOwner(state.round));
    case 'tiebreak-first':
      return 0;
    case 'tiebreak-second':
      return 1;
  }
}

export function currentDuelCountryId(state: DuelState): CountryId {
  const order = isTiebreak(state.stage) ? state.tiebreakOrder : state.questions;
  const index = isTiebreak(state.stage) ? state.tiebreakRound % order.length : state.round;
  const id = order[index];
  if (id === undefined) throw new Error('No current question');
  return id;
}

/** Points the active player can win with the current question. */
export function currentDuelPoints(state: DuelState): number {
  return state.stage === 'steal' ? STEAL_POINTS : MAX_POINTS;
}

/** Only the turn's owner may give up, and never in the Rodada de Fogo or on a steal. */
export function canGiveUp(state: DuelState): boolean {
  return state.status === 'asking' && state.stage === 'primary';
}

export function duelReducer(state: DuelState, event: DuelEvent): DuelState {
  switch (event.type) {
    case 'guess':
      return state.status === 'asking' && event.player === activePlayer(state) ? answer(state, event.guess) : state;
    case 'give_up':
      return canGiveUp(state) && event.player === activePlayer(state)
        ? resolve(state, { kind: 'primary_failed', gaveUp: true })
        : state;
    case 'next':
      return state.status === 'resolved' ? advance(state) : state;
  }
}

function resolve(state: DuelState, resolution: DuelResolution): DuelState {
  return { ...state, status: 'resolved', resolution };
}

function answer(state: DuelState, guess: Guess): DuelState {
  const correct = isCorrectGuess(getCountry(currentDuelCountryId(state)), guess);
  switch (state.stage) {
    case 'primary':
      return correct
        ? score(state, activePlayer(state), MAX_POINTS, false)
        : resolve(state, { kind: 'primary_failed', gaveUp: false });
    case 'steal':
      return correct ? score(state, activePlayer(state), STEAL_POINTS, true) : miss(state);
    case 'tiebreak-first':
      return resolve(state, { kind: 'tiebreak_first_answered', correct });
    case 'tiebreak-second':
      return answerTiebreakSecond(state, correct);
  }
}

function score(state: DuelState, player: PlayerIndex, points: number, stolen: boolean): DuelState {
  const scores: [number, number] = [state.scores[0], state.scores[1]];
  scores[player] += points;
  const result: DuelResult = { countryId: currentDuelCountryId(state), player, points, stolen };
  return { ...resolve(state, { kind: 'scored', player, points, stolen }), scores, results: [...state.results, result] };
}

function miss(state: DuelState): DuelState {
  const result: DuelResult = { countryId: currentDuelCountryId(state), player: null, points: 0, stolen: false };
  return { ...resolve(state, { kind: 'nobody_scored' }), results: [...state.results, result] };
}

function answerTiebreakSecond(state: DuelState, correct: boolean): DuelState {
  const firstCorrect = state.tiebreakFirstCorrect;
  if (firstCorrect === null) throw new Error('Second tiebreak answer without a first one');
  if (firstCorrect === correct) return resolve(state, { kind: 'tiebreak_replay', bothCorrect: correct });
  return resolve(state, { kind: 'tiebreak_decided', winner: firstCorrect ? 0 : 1 });
}

function advance(state: DuelState): DuelState {
  const resolution = state.resolution;
  if (resolution === null) return state;
  switch (resolution.kind) {
    case 'primary_failed':
      return { ...state, stage: 'steal', status: 'asking', resolution: null };
    case 'scored':
    case 'nobody_scored':
      return nextRound(state);
    case 'tiebreak_first_answered':
      return {
        ...state,
        stage: 'tiebreak-second',
        status: 'asking',
        resolution: null,
        tiebreakFirstCorrect: resolution.correct,
      };
    case 'tiebreak_replay':
      return {
        ...state,
        stage: 'tiebreak-first',
        status: 'asking',
        resolution: null,
        tiebreakFirstCorrect: null,
        tiebreakRound: state.tiebreakRound + 1,
      };
    case 'tiebreak_decided':
      return { ...state, status: 'finished', resolution: null, winner: resolution.winner };
  }
}

function nextRound(state: DuelState): DuelState {
  const round = state.round + 1;
  if (round < state.questions.length) return { ...state, round, stage: 'primary', status: 'asking', resolution: null };

  const [a, b] = state.scores;
  if (a === b) return { ...state, round, stage: 'tiebreak-first', status: 'asking', resolution: null };
  return { ...state, round, status: 'finished', resolution: null, winner: a > b ? 0 : 1 };
}
