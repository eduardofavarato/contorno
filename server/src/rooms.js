import { randomInt } from 'node:crypto';
import { DisputaGame } from './disputa.js';

// No 0/O/1/I: codes are read aloud and typed on phones.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const START_DELAY_MS = 1000;

/** Minimal view of a player connection, so rooms and games stay testable without real sockets. */
export class Player {
  constructor({ send, close }) {
    this.send = send;
    this.close = close;
  }
}

/** Two players and the duel between them. Owns every timer it schedules, so closing the room cancels them. */
export class Room {
  constructor(code, level, { random = Math.random, now = Date.now } = {}) {
    this.code = code;
    this.players = [null, null];
    this.createdAt = now();
    this.timers = new Set();
    this.game = new DisputaGame({
      level,
      random,
      broadcast: message => this.broadcast(message),
      schedule: (fn, ms) => this.schedule(fn, ms),
    });
  }

  get isEmpty() {
    return this.players.every(player => player === null);
  }

  get isFull() {
    return this.players.every(player => player !== null);
  }

  /** Returns the seat (0 = A, 1 = B), or -1 when both are taken or the duel already started. */
  join(player) {
    const seat = this.players.indexOf(null);
    if (seat === -1 || this.game.phase !== 'waiting') return -1;
    this.players[seat] = player;
    player.send({ type: 'assigned', role: seat === 0 ? 'a' : 'b' });
    if (this.isFull) {
      this.broadcast({ type: 'both_connected' });
      this.schedule(() => this.game.start(), START_DELAY_MS);
    }
    return seat;
  }

  handle(player, message) {
    const seat = this.players.indexOf(player);
    if (seat !== -1) this.game.handle(seat, message);
  }

  leave(player) {
    const seat = this.players.indexOf(player);
    if (seat === -1) return;
    this.players[seat] = null;
    if (this.game.isRunning) {
      this.game.abandon();
      this.broadcast({ type: 'opponent_left' });
    }
  }

  broadcast(message) {
    for (const player of this.players) player?.send(message);
  }

  schedule(fn, ms) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }

  dispose() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const player of this.players) player?.close();
    this.players = [null, null];
  }
}

export class RoomRegistry {
  constructor({ maxAgeMs = 60 * 60 * 1000, random = Math.random, now = Date.now } = {}) {
    this.rooms = new Map();
    this.maxAgeMs = maxAgeMs;
    this.random = random;
    this.now = now;
  }

  get size() {
    return this.rooms.size;
  }

  create(level) {
    let code;
    do {
      code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
    } while (this.rooms.has(code));
    const room = new Room(code, level, { random: this.random, now: this.now });
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(code.toUpperCase());
  }

  /** Called when a player disconnects: an empty room is gone for good. */
  release(room) {
    if (room.isEmpty) this.remove(room);
  }

  /** Drops rooms nobody closed properly (e.g. a phone that went offline mid-game). */
  sweep() {
    const cutoff = this.now() - this.maxAgeMs;
    for (const room of this.rooms.values()) {
      if (room.createdAt < cutoff) this.remove(room);
    }
  }

  remove(room) {
    room.dispose();
    this.rooms.delete(room.code);
  }

  dispose() {
    for (const room of this.rooms.values()) room.dispose();
    this.rooms.clear();
  }
}
