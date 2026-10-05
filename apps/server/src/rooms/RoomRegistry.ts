import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, type GameSetup, type Random } from '@contorno/core';
import type { MatchOutcome } from './DuelMatch';
import { DEFAULT_START_DELAY_MS, Room } from './Room';

interface RegistryOptions {
  readonly maxAgeMs?: number;
  readonly maxRooms?: number;
  readonly random?: Random;
  readonly now?: () => number;
  readonly onFinished?: (outcome: MatchOutcome) => void;
  readonly startDelayMs?: number;
}

const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;
const DEFAULT_MAX_ROOMS = 1000;

export class RoomRegistry {
  private readonly rooms = new Map<string, Room>();
  private readonly maxAgeMs: number;
  private readonly maxRooms: number;
  private readonly random: Random;
  private readonly now: () => number;
  private readonly onFinished: (outcome: MatchOutcome) => void;
  private readonly startDelayMs: number;

  constructor(options: RegistryOptions = {}) {
    this.maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    this.maxRooms = options.maxRooms ?? DEFAULT_MAX_ROOMS;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
    this.onFinished = options.onFinished ?? (() => undefined);
    this.startDelayMs = options.startDelayMs ?? DEFAULT_START_DELAY_MS;
  }

  get size(): number {
    return this.rooms.size;
  }

  /** Opens a room with a fresh code, or returns `null` when the server is at capacity. */
  create(setup: GameSetup): Room | null {
    if (this.rooms.size >= this.maxRooms) return null;
    let code: string;
    do {
      code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
        ROOM_CODE_ALPHABET.charAt(randomInt(ROOM_CODE_ALPHABET.length)),
      ).join('');
    } while (this.rooms.has(code));

    const room = new Room(code, setup, {
      random: this.random,
      now: this.now,
      onFinished: this.onFinished,
      startDelayMs: this.startDelayMs,
    });
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /** Called when a player disconnects: a room nobody is in is gone for good. */
  release(room: Room): void {
    if (room.isEmpty) this.remove(room);
  }

  /** Drops rooms nobody closed properly (e.g. a phone that went offline mid-game). */
  sweep(): void {
    const cutoff = this.now() - this.maxAgeMs;
    for (const room of this.rooms.values()) {
      if (room.createdAt < cutoff) this.remove(room);
    }
  }

  dispose(): void {
    for (const room of this.rooms.values()) room.dispose();
    this.rooms.clear();
  }

  private remove(room: Room): void {
    room.dispose();
    this.rooms.delete(room.code);
  }
}
