import type { CountryId } from '../countries/types';
import {
  activePlayer,
  canGiveUp,
  currentDuelCountryId,
  currentDuelPoints,
  type DuelResolution,
  type DuelResult,
  type DuelStage,
  type DuelState,
  type PlayerIndex,
} from './duel';

/**
 * What a player's screen needs from a duel, and nothing more: unlike `DuelState` it does not carry the
 * upcoming questions, so it is safe to send to clients.
 */
export interface DuelView {
  readonly stage: DuelStage;
  readonly status: DuelState['status'];
  readonly resolution: DuelResolution | null;
  /** Index of the current main question. */
  readonly round: number;
  readonly questionCount: number;
  readonly tiebreakRound: number;
  readonly scores: readonly [number, number];
  readonly results: readonly DuelResult[];
  readonly winner: PlayerIndex | null;
  /** The country being asked; `null` once the duel is finished. */
  readonly countryId: CountryId | null;
  readonly activePlayer: PlayerIndex;
  readonly canGiveUp: boolean;
  /** Points the active player can win with the current question. */
  readonly points: number;
}

export function toDuelView(state: DuelState): DuelView {
  const finished = state.status === 'finished';
  return {
    stage: state.stage,
    status: state.status,
    resolution: state.resolution,
    round: state.round,
    questionCount: state.questions.length,
    tiebreakRound: state.tiebreakRound,
    scores: state.scores,
    results: state.results,
    winner: state.winner,
    countryId: finished ? null : currentDuelCountryId(state),
    activePlayer: activePlayer(state),
    canGiveUp: canGiveUp(state),
    points: currentDuelPoints(state),
  };
}
