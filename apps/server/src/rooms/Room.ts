import type { GameSetup, Guess, PlayerIndex, Random } from '@contorno/core';
import type { Connection } from './connection';
import { DuelMatch, type MatchOutcome } from './DuelMatch';
import { Scheduler } from './scheduler';

/** Default pause between the second player arriving and the first question, so both screens are ready. */
export const DEFAULT_START_DELAY_MS = 1000;

interface RoomOptions {
  readonly random: Random;
  readonly now: () => number;
  readonly onFinished: (outcome: MatchOutcome) => void;
  readonly startDelayMs: number;
}

/** Two seats and the duel played in them. Once both seats have been taken, a departure ends the room. */
export class Room {
  readonly createdAt: number;
  private readonly seats: [Connection | null, Connection | null] = [null, null];
  private readonly scheduler = new Scheduler();
  private match: DuelMatch | null = null;
  private closed = false;

  constructor(
    readonly code: string,
    private readonly setup: GameSetup,
    private readonly options: RoomOptions,
  ) {
    this.createdAt = options.now();
  }

  get isEmpty(): boolean {
    return this.seats.every((seat) => seat === null);
  }

  get isJoinable(): boolean {
    return !this.closed && this.match === null && this.seats.includes(null);
  }

  /** Seats the connection and tells it where it sits; returns the seat, or `null` when it cannot join. */
  join(connection: Connection): PlayerIndex | null {
    if (!this.isJoinable) return null;
    const player: PlayerIndex = this.seats[0] === null ? 0 : 1;
    this.seats[player] = connection;
    connection.send({ type: 'room', code: this.code, player, setup: this.setup });

    const [host, guest] = this.seats;
    if (host && guest) {
      host.send({ type: 'opponent_joined' });
      this.match = new DuelMatch({
        setup: this.setup,
        random: this.options.random,
        scheduler: this.scheduler,
        publish: (view) => {
          this.broadcast({ type: 'state', view });
        },
        onFinished: this.options.onFinished,
      });
      this.scheduler.after(this.options.startDelayMs, () => this.match?.start());
    }
    return player;
  }

  guess(connection: Connection, guess: Guess): void {
    const player = this.seatOf(connection);
    if (player !== null) this.match?.guess(player, guess);
  }

  giveUp(connection: Connection): void {
    const player = this.seatOf(connection);
    if (player !== null) this.match?.giveUp(player);
  }

  leave(connection: Connection): void {
    const player = this.seatOf(connection);
    if (player === null) return;
    this.seats[player] = null;

    if (!this.closed && this.match) {
      // The duel cannot go on without both players: whoever stayed is told and the room is over.
      this.closed = true;
      this.match.abandon();
      this.scheduler.dispose();
      this.broadcast({ type: 'opponent_left' });
    }
  }

  /** Cancels timers and disconnects whoever is still seated. */
  dispose(): void {
    this.closed = true;
    this.match?.abandon();
    this.scheduler.dispose();
    for (const seat of this.seats) seat?.close();
    this.seats[0] = null;
    this.seats[1] = null;
  }

  private seatOf(connection: Connection): PlayerIndex | null {
    if (this.seats[0] === connection) return 0;
    return this.seats[1] === connection ? 1 : null;
  }

  private broadcast(message: Parameters<Connection['send']>[0]): void {
    for (const seat of this.seats) seat?.send(message);
  }
}
