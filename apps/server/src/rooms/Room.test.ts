import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameSetup } from '@contorno/core';
import { Room } from './Room';
import { correctAnswer, currentCountry, FakeConnection, required } from './testing';

const setup: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
/** Fixed shuffle: the questions are the same every run. */
const random = () => 0;

function newRoom(onFinished = vi.fn()) {
  const room = new Room('AB23', setup, { random, now: () => 0, onFinished, startDelayMs: 1000 });
  const host = new FakeConnection();
  const guest = new FakeConnection();
  return { room, host, guest, onFinished };
}

function startedRoom() {
  const fixture = newRoom();
  fixture.room.join(fixture.host);
  fixture.room.join(fixture.guest);
  vi.advanceTimersByTime(1000);
  return fixture;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('joining', () => {
  it('seats the host as player A and tells them the room', () => {
    const { room, host } = newRoom();

    expect(room.join(host)).toBe(0);
    expect(host.received).toEqual([{ type: 'room', code: 'AB23', player: 0, setup }]);
  });

  it('seats the guest as player B and tells the host', () => {
    const { room, host, guest } = newRoom();
    room.join(host);

    expect(room.join(guest)).toBe(1);
    expect(guest.of('room')[0]).toMatchObject({ player: 1, setup });
    expect(host.of('opponent_joined')).toHaveLength(1);
  });

  it('refuses a third player', () => {
    const { room, host, guest } = newRoom();
    room.join(host);
    room.join(guest);

    expect(room.join(new FakeConnection())).toBeNull();
  });

  it('starts the duel only after the start delay', () => {
    const { room, host, guest } = newRoom();
    room.join(host);
    room.join(guest);

    expect(host.of('state')).toHaveLength(0);
    vi.advanceTimersByTime(1000);
    expect(host.view).toMatchObject({ status: 'asking', stage: 'primary', activePlayer: 0, scores: [0, 0] });
    expect(guest.view).toEqual(host.view);
  });
});

describe('playing', () => {
  it("judges a player's answer and tells both", () => {
    const { room, host, guest } = startedRoom();
    room.guess(host, correctAnswer(currentCountry(host)));

    expect(host.view).toMatchObject({ status: 'resolved', scores: [2000, 0] });
    expect(guest.view).toEqual(host.view);
  });

  it('moves on by itself after the pause', () => {
    const { room, host } = startedRoom();
    room.guess(host, correctAnswer(currentCountry(host)));

    vi.advanceTimersByTime(1600);

    expect(host.view).toMatchObject({ status: 'asking', round: 1, activePlayer: 1 });
  });

  it('ignores answers from the player whose turn it is not', () => {
    const { room, host, guest } = startedRoom();
    const before = guest.of('state').length;

    room.guess(guest, correctAnswer(currentCountry(guest)));

    expect(guest.of('state')).toHaveLength(before);
    expect(host.view.scores).toEqual([0, 0]);
  });

  it('offers the steal to the rival after a give up', () => {
    const { room, host, guest } = startedRoom();

    room.giveUp(host);
    expect(guest.view.resolution).toEqual({ kind: 'primary_failed', gaveUp: true });

    vi.advanceTimersByTime(2000);
    expect(guest.view).toMatchObject({ stage: 'steal', activePlayer: 1, points: 1000 });
  });

  it('ignores answers from connections that are not seated', () => {
    const { room, host } = startedRoom();
    const before = host.of('state').length;

    room.guess(new FakeConnection(), correctAnswer(currentCountry(host)));

    expect(host.of('state')).toHaveLength(before);
  });

  it('reports the outcome once the duel ends', () => {
    const { room, host, guest, onFinished } = startedRoom();
    const players = [host, guest];

    // Everyone answers their own turns right: 5 x 2.000 each, a tie that the Rodada de Fogo settles.
    for (let round = 0; round < 10; round++) {
      room.guess(required(players[round % 2]), correctAnswer(currentCountry(host)));
      vi.advanceTimersByTime(1600);
    }
    expect(host.view).toMatchObject({ stage: 'tiebreak-first', activePlayer: 0 });

    room.guess(host, correctAnswer(currentCountry(host)));
    vi.advanceTimersByTime(1500);
    room.guess(guest, { type: 'text', value: 'zzz' });
    expect(onFinished).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);

    expect(host.view).toMatchObject({ status: 'finished', winner: 0, question: null });
    expect(onFinished).toHaveBeenCalledExactlyOnceWith({ setup, winner: 0, scores: [10000, 10000] });
  });
});

describe('leaving', () => {
  it('tells the other player and stops the duel', () => {
    const { room, host, guest } = startedRoom();

    room.leave(guest);
    expect(host.of('opponent_left')).toHaveLength(1);

    const before = host.of('state').length;
    room.guess(host, correctAnswer(currentCountry(host)));
    vi.advanceTimersByTime(10_000);
    expect(host.of('state')).toHaveLength(before);
  });

  it('cancels the start when someone leaves during the start delay', () => {
    const { room, host, guest } = newRoom();
    room.join(host);
    room.join(guest);

    room.leave(guest);
    vi.advanceTimersByTime(5000);

    expect(host.of('opponent_left')).toHaveLength(1);
    expect(host.of('state')).toHaveLength(0);
  });

  it('is empty once everyone left, and closed to newcomers', () => {
    const { room, host, guest } = newRoom();
    room.join(host);
    room.join(guest);
    room.leave(host);
    room.leave(guest);

    expect(room.isEmpty).toBe(true);
    expect(room.join(new FakeConnection())).toBeNull();
  });

  it('lets a host who has not been joined yet leave quietly', () => {
    const { room, host } = newRoom();
    room.join(host);

    room.leave(host);

    expect(room.isEmpty).toBe(true);
    expect(host.of('opponent_left')).toHaveLength(0);
  });

  it('disconnects everyone when disposed', () => {
    const { room, host, guest } = startedRoom();

    room.dispose();

    expect(host.close).toHaveBeenCalled();
    expect(guest.close).toHaveBeenCalled();
  });
});
