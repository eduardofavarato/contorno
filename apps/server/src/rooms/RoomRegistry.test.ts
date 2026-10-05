import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, type GameSetup } from '@contorno/core';
import { describe, expect, it } from 'vitest';
import { RoomRegistry } from './RoomRegistry';
import { FakeConnection } from './testing';

const setup: GameSetup = { mode: 'localizar', pool: { kind: 'level', level: 2 } };

function create(registry: RoomRegistry) {
  const room = registry.create(setup);
  if (!room) throw new Error('Registry refused to create a room');
  return room;
}

describe('RoomRegistry', () => {
  it('creates rooms with readable, unique codes', () => {
    const registry = new RoomRegistry();
    const codes = Array.from({ length: 50 }, () => create(registry).code);

    expect(new Set(codes).size).toBe(50);
    for (const code of codes) {
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(Array.from(code).every((char) => ROOM_CODE_ALPHABET.includes(char))).toBe(true);
    }
    expect(registry.size).toBe(50);
  });

  it('finds a room by its code', () => {
    const registry = new RoomRegistry();
    const room = create(registry);

    expect(registry.get(room.code)).toBe(room);
    expect(registry.get('ZZZZ')).toBeUndefined();
  });

  it('drops a room once nobody is left in it', () => {
    const registry = new RoomRegistry();
    const room = create(registry);
    const host = new FakeConnection();
    room.join(host);

    registry.release(room);
    expect(registry.size).toBe(1);

    room.leave(host);
    registry.release(room);
    expect(registry.size).toBe(0);
  });

  it('sweeps rooms older than the maximum age', () => {
    let now = 0;
    const registry = new RoomRegistry({ maxAgeMs: 1000, now: () => now });
    const old = create(registry);
    now = 900;
    const recent = create(registry);

    now = 1500;
    registry.sweep();

    expect(registry.get(old.code)).toBeUndefined();
    expect(registry.get(recent.code)).toBe(recent);
  });

  it('refuses new rooms at capacity', () => {
    const registry = new RoomRegistry({ maxRooms: 2 });
    create(registry);
    create(registry);

    expect(registry.create(setup)).toBeNull();
  });

  it('disconnects everyone when disposed', () => {
    const registry = new RoomRegistry();
    const host = new FakeConnection();
    create(registry).join(host);

    registry.dispose();

    expect(host.close).toHaveBeenCalled();
    expect(registry.size).toBe(0);
  });
});
