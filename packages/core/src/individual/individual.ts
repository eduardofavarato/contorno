import { isCorrectGuess, toQuestionInfo, type Guess, type Question, type QuestionInfo } from '../quiz/question';
import type { Quiz } from '../quiz/quiz';
import { shuffle, type Random } from '../random';
import { MAX_ATTEMPTS, pointsAfterWrongs } from '../scoring';

export type IndividualOutcome = 'correct' | 'failed' | 'gave_up';

export interface IndividualResult {
  readonly question: QuestionInfo;
  readonly outcome: IndividualOutcome;
  readonly wrongs: number;
  readonly points: number;
}

export interface IndividualState {
  readonly questions: readonly Question[];
  readonly index: number;
  readonly score: number;
  /** Wrong guesses on the current question. */
  readonly wrongs: number;
  /** `resolved`: the question is settled and waits for `next`. */
  readonly status: 'asking' | 'resolved' | 'finished';
  readonly results: readonly IndividualResult[];
  /** Every event the game accepted, in order: what a server needs to replay and verify the game. */
  readonly events: readonly IndividualEvent[];
}

export type IndividualEvent =
  { readonly type: 'guess'; readonly guess: Guess } | { readonly type: 'give_up' } | { readonly type: 'next' };

/** The questions of a solo game: all of them, or a random sample when the quiz asks for one. */
export function selectIndividualQuestions(quiz: Quiz, random: Random): Question[] {
  const shuffled = shuffle(quiz.questions, random);
  return quiz.soloCount === null ? shuffled : shuffled.slice(0, quiz.soloCount);
}

export function startIndividual(questions: readonly Question[]): IndividualState {
  if (questions.length === 0) throw new Error('An individual game needs at least one question');
  return { questions, index: 0, score: 0, wrongs: 0, status: 'asking', results: [], events: [] };
}

export function currentIndividualQuestion(state: IndividualState): Question {
  const question = state.questions[state.index];
  if (question === undefined) throw new Error('No current question');
  return question;
}

/** Points the current question is worth right now. */
export function currentIndividualPoints(state: IndividualState): number {
  return pointsAfterWrongs(state.wrongs);
}

export function individualReducer(state: IndividualState, event: IndividualEvent): IndividualState {
  const next = apply(state, event);
  // Events the game ignores leave no trace, so the log only holds moves that really happened.
  return next === state ? state : { ...next, events: [...state.events, event] };
}

function apply(state: IndividualState, event: IndividualEvent): IndividualState {
  switch (event.type) {
    case 'guess':
      return state.status === 'asking' ? guess(state, event.guess) : state;
    case 'give_up':
      return state.status === 'asking' ? settle(state, 'gave_up', 0) : state;
    case 'next':
      return state.status === 'resolved' ? advance(state) : state;
  }
}

function guess(state: IndividualState, attempt: Guess): IndividualState {
  if (isCorrectGuess(currentIndividualQuestion(state), attempt)) {
    return settle(state, 'correct', currentIndividualPoints(state));
  }
  const wrongs = state.wrongs + 1;
  return wrongs >= MAX_ATTEMPTS ? settle({ ...state, wrongs }, 'failed', 0) : { ...state, wrongs };
}

function settle(state: IndividualState, outcome: IndividualOutcome, points: number): IndividualState {
  const result: IndividualResult = {
    question: toQuestionInfo(currentIndividualQuestion(state)),
    outcome,
    wrongs: state.wrongs,
    points,
  };
  return { ...state, score: state.score + points, status: 'resolved', results: [...state.results, result] };
}

function advance(state: IndividualState): IndividualState {
  const index = state.index + 1;
  if (index >= state.questions.length) return { ...state, index, status: 'finished' };
  return { ...state, index, wrongs: 0, status: 'asking' };
}
