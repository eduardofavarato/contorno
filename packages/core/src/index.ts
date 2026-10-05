export { findCountry, getCountry, countriesForContinent, countriesForLevel } from './countries/catalog';
export { CONTINENT_IDS, CONTINENTS, type Continent, type ContinentInfo } from './countries/continents';
export { BRASIL_STATES, BRASIL_CITIES } from './brasil/data';
export { BRASIL_TOPICS, brasilChallenge, type BrasilTopic } from './brasil/topics';
export type { BrasilCity, BrasilState, StateCode } from './brasil/types';
export { COUNTRIES } from './countries/data';
export type { Country, CountryId, Level } from './countries/types';
export {
  activePlayer,
  canGiveUp,
  currentDuelQuestion,
  currentDuelPoints,
  duelReducer,
  revealsAnswer,
  selectDuelSetup,
  startDuel,
  type DuelEvent,
  type DuelResolution,
  type DuelResult,
  type DuelSetup,
  type DuelStage,
  type DuelState,
  type PlayerIndex,
} from './duel/duel';
export { freeReducer, freeStats, startFree, type FreeAnswer, type FreeEvent, type FreeState } from './free/free';
export {
  currentIndividualQuestion,
  currentIndividualPoints,
  individualReducer,
  selectIndividualQuestions,
  startIndividual,
  type IndividualEvent,
  type IndividualOutcome,
  type IndividualResult,
  type IndividualState,
} from './individual/individual';
export { MAX_ANSWER_LENGTH } from './api/schemas';
export { duelResolutionDelayMs } from './duel/timing';
export { toDuelView, type DuelView } from './duel/view';
export {
  decodeClientMessage,
  decodeServerMessage,
  encodeMessage,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ClientMessage,
  type ErrorCode,
  type ServerMessage,
} from './online/protocol';
export { challengeFor, mapFor, type GameFormat, type GameMode, type GameSetup } from './modes';
export type { BrasilPool, ContinentPool, LevelPool } from './pool/pool';
export {
  isCorrectGuess,
  matchesAnswer,
  toQuestionInfo,
  toQuestionPrompt,
  type Challenge,
  type Guess,
  type Question,
  type QuestionId,
  type QuestionInfo,
  type QuestionPrompt,
  type RegionId,
} from './quiz/question';
export { questionsFor, quizFor, type MapKind, type Quiz } from './quiz/quiz';
export { shuffle, type Random } from './random';
export {
  MAX_ATTEMPTS,
  MAX_POINTS,
  pointsAfterWrongs,
  QUESTIONS_PER_GAME,
  STEAL_POINTS,
  WRONG_GUESS_PENALTY,
} from './scoring';
export { normalize } from './text/normalize';
export * from './api/contracts';
export { gameSetupSchema, guessSchema, individualEventSchema } from './api/schemas';
export { ALL_BOARDS, boardKeyFor, setupForBoard, type BoardKey } from './ranking/board';
export { replayIndividual, type ReplayResult } from './individual/replay';
