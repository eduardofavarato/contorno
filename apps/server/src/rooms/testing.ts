import { getCountry, type CountryId, type ServerMessage } from '@contorno/core';
import { vi } from 'vitest';
import type { Connection } from './connection';

/** A player connection that records what the server sent it. */
export class FakeConnection implements Connection {
  readonly received: ServerMessage[] = [];
  readonly close = vi.fn();

  send(message: ServerMessage): void {
    this.received.push(message);
  }

  /** Messages of one type, in order. */
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[] {
    return this.received.filter((message): message is Extract<ServerMessage, { type: T }> => message.type === type);
  }

  /** The latest duel view this player was sent. */
  get view() {
    const states = this.of('state');
    const last = states.at(-1);
    if (!last) throw new Error('No state received yet');
    return last.view;
  }
}

/** A typed answer that is right for the country. */
export function correctAnswer(id: CountryId): { type: 'text'; value: string } {
  return { type: 'text', value: getCountry(id).aliases[0] ?? '' };
}

/** The country this player is currently being asked about. */
export function currentCountry(connection: FakeConnection): CountryId {
  const { question } = connection.view;
  if (question === null) throw new Error('The duel has no current question');
  return question.regionId;
}

/** Narrows `T | undefined` for values a test knows exist, failing loudly otherwise. */
export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected a value, got undefined');
  return value;
}
