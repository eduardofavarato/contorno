import {
  duelReducer,
  duelResolutionDelayMs,
  quizFor,
  selectDuelSetup,
  startDuel,
  toDuelView,
  type DuelEvent,
  type DuelState,
  type DuelView,
  type GameSetup,
  type Guess,
  type PlayerIndex,
  type Random,
} from '@contorno/core';
import type { Scheduler } from './scheduler';

export interface MatchOutcome {
  readonly setup: GameSetup;
  readonly winner: PlayerIndex;
  readonly scores: readonly [number, number];
}

interface MatchOptions {
  readonly setup: GameSetup;
  readonly random: Random;
  readonly scheduler: Scheduler;
  /** Called with the new view after every change of the duel. */
  readonly publish: (view: DuelView) => void;
  readonly onFinished: (outcome: MatchOutcome) => void;
}

/**
 * The authoritative duel: it picks the countries, judges the answers and keeps the score, so neither client can
 * cheat. It runs the same `duelReducer` the local game uses and only adds the pacing between questions.
 */
export class DuelMatch {
  private state: DuelState;
  private ended = false;

  constructor(private readonly options: MatchOptions) {
    this.state = startDuel(selectDuelSetup(quizFor(options.setup), options.random));
  }

  get isRunning(): boolean {
    return !this.ended;
  }

  /** Sends the opening question to both players. */
  start(): void {
    this.options.publish(toDuelView(this.state));
  }

  guess(player: PlayerIndex, guess: Guess): void {
    this.apply({ type: 'guess', player, guess });
  }

  giveUp(player: PlayerIndex): void {
    this.apply({ type: 'give_up', player });
  }

  /** Stops the duel for good (a player left): no more state, no more timers. */
  abandon(): void {
    this.ended = true;
  }

  private apply(event: DuelEvent): void {
    if (this.ended) return;
    const next = duelReducer(this.state, event);
    // The reducer hands back the same state when it ignores an event (wrong turn, already answered...).
    if (next === this.state) return;
    this.state = next;
    this.options.publish(toDuelView(next));

    if (next.resolution) {
      const delay = duelResolutionDelayMs(next.resolution);
      this.options.scheduler.after(delay, () => {
        this.apply({ type: 'next' });
      });
    }
    if (next.status === 'finished' && next.winner !== null) {
      this.ended = true;
      this.options.onFinished({ setup: this.options.setup, winner: next.winner, scores: next.scores });
    }
  }
}
