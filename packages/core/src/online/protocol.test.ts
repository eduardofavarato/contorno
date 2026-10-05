import { describe, expect, it } from 'vitest';
import { duelReducer, startDuel } from '../duel/duel';
import { toDuelView } from '../duel/view';
import { BRASIL, CHILE } from '../test-support';
import {
  decodeClientMessage,
  decodeServerMessage,
  encodeMessage,
  MAX_ANSWER_LENGTH,
  type ClientMessage,
  type ServerMessage,
} from './protocol';

const json = (value: unknown) => JSON.stringify(value);
const setup = { mode: 'perguntas', pool: { kind: 'level', level: 2 } } as const;

describe('client messages', () => {
  it('round-trips every kind', () => {
    const messages: ClientMessage[] = [
      { type: 'create', setup },
      { type: 'create', setup: { mode: 'continentes', pool: { kind: 'continent', continent: 'asia' } } },
      { type: 'join', room: 'AB23' },
      { type: 'guess', guess: { type: 'text', value: 'brasil' } },
      { type: 'guess', guess: { type: 'country', id: BRASIL } },
      { type: 'give_up' },
    ];

    for (const message of messages) expect(decodeClientMessage(encodeMessage(message))).toEqual(message);
  });

  it('normalizes room codes to upper case', () => {
    expect(decodeClientMessage(json({ type: 'join', room: 'ab23' }))).toEqual({ type: 'join', room: 'AB23' });
  });

  it.each([
    ['not json', 'nope'],
    ['an array', json([])],
    ['an unknown type', json({ type: 'hack' })],
    ['a join with a short code', json({ type: 'join', room: 'AB2' })],
    ['a join with forbidden characters', json({ type: 'join', room: 'AB0O' })],
    [
      'a create with a level out of range',
      json({ type: 'create', setup: { mode: 'perguntas', pool: { kind: 'level', level: 4 } } }),
    ],
    [
      'a mode with the wrong pool kind',
      json({ type: 'create', setup: { mode: 'continentes', pool: { kind: 'level', level: 1 } } }),
    ],
    [
      'an unknown continent',
      json({ type: 'create', setup: { mode: 'continentes', pool: { kind: 'continent', continent: 'atlantis' } } }),
    ],
    ['an over-long answer', json({ type: 'guess', guess: { type: 'text', value: 'a'.repeat(MAX_ANSWER_LENGTH + 1) } })],
    ['a non-integer country', json({ type: 'guess', guess: { type: 'country', id: 1.5 } })],
    ['extra fields', json({ type: 'give_up', admin: true })],
  ])('rejects %s', (_label, raw) => {
    expect(decodeClientMessage(raw)).toBeNull();
  });
});

describe('server messages', () => {
  it('round-trips a duel view', () => {
    const state = duelReducer(startDuel({ questions: [BRASIL], tiebreakOrder: [CHILE] }), {
      type: 'guess',
      player: 0,
      guess: { type: 'text', value: 'peru' },
    });
    const messages: ServerMessage[] = [
      { type: 'room', code: 'AB23', player: 1, setup },
      { type: 'opponent_joined' },
      { type: 'state', view: toDuelView(state) },
      { type: 'opponent_left' },
      { type: 'error', code: 'room_full' },
    ];

    for (const message of messages) expect(decodeServerMessage(encodeMessage(message))).toEqual(message);
  });

  it('rejects malformed messages', () => {
    expect(decodeServerMessage(json({ type: 'state', view: {} }))).toBeNull();
    expect(decodeServerMessage(json({ type: 'error', code: 'boom' }))).toBeNull();
    expect(decodeServerMessage('nope')).toBeNull();
  });
});
