import { toDuelView, startDuel, duelReducer, type GameSetup, type ServerMessage } from '@contorno/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeWebSocket } from '../test-utils';
import {
  CONNECTING,
  OnlineSession,
  sessionReducer,
  websocketUrl,
  type SessionEvent,
  type SessionState,
} from './session';

const setup: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const BRASIL = 76;
const view = toDuelView(startDuel({ questions: [BRASIL], tiebreakOrder: [32] }));
const finishedView = toDuelView(
  [{ type: 'guess', player: 0, guess: { type: 'text', value: 'brasil' } }, { type: 'next' }].reduce(
    duelReducer as never,
    startDuel({ questions: [BRASIL], tiebreakOrder: [32] }),
  ),
);

const room: ServerMessage = { type: 'room', code: 'AB23', player: 1, setup };

function run(...events: SessionEvent[]): SessionState {
  return events.reduce(sessionReducer, CONNECTING);
}

describe('sessionReducer', () => {
  it('waits in the room once seated, then notes the opponent', () => {
    expect(run(room)).toEqual({ phase: 'waiting', code: 'AB23', player: 1, setup, opponentJoined: false });
    expect(run(room, { type: 'opponent_joined' })).toMatchObject({ phase: 'waiting', opponentJoined: true });
  });

  it('plays once the first state arrives, and follows each new one', () => {
    const playing = run(room, { type: 'state', view });

    expect(playing).toEqual({ phase: 'playing', player: 1, setup, view });
    expect(run(room, { type: 'state', view }, { type: 'state', view: { ...view, round: 1 } })).toMatchObject({
      view: { round: 1 },
    });
  });

  it('ignores states before it has a seat', () => {
    expect(run({ type: 'state', view })).toBe(CONNECTING);
  });

  it('is interrupted when the opponent leaves or the connection drops mid-match', () => {
    expect(run(room, { type: 'state', view }, { type: 'opponent_left' })).toEqual({
      phase: 'interrupted',
      reason: 'opponent_left',
    });
    expect(run(room, { type: 'socket_closed' })).toEqual({ phase: 'interrupted', reason: 'connection_lost' });
  });

  it('keeps the final result when the opponent leaves or the socket closes afterwards', () => {
    const over = run(room, { type: 'state', view: finishedView });

    expect(over).toMatchObject({ phase: 'playing', view: { status: 'finished' } });
    expect(sessionReducer(over, { type: 'opponent_left' })).toBe(over);
    expect(sessionReducer(over, { type: 'socket_closed' })).toBe(over);
  });

  it('shows the refusal, which the closing socket must not overwrite', () => {
    const refused = run({ type: 'error', code: 'room_full' });

    expect(refused).toEqual({ phase: 'refused', code: 'room_full' });
    expect(sessionReducer(refused, { type: 'socket_closed' })).toBe(refused);
  });
});

describe('OnlineSession', () => {
  beforeEach(() => {
    FakeWebSocket.reset();
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const socket = () => FakeWebSocket.latest();

  it('asks for a room as soon as the connection opens', () => {
    const session = new OnlineSession('ws://host/ws');
    session.start({ type: 'create', setup });

    expect(socket().url).toBe('ws://host/ws');
    expect(socket().sent).toEqual([]);
    socket().open();
    expect(socket().messages[0]).toEqual({ type: 'create', setup });
  });

  it('updates its state and tells subscribers as the server talks', () => {
    const session = new OnlineSession('ws://host/ws');
    const listener = vi.fn();
    session.subscribe(listener);
    session.start({ type: 'join', room: 'AB23' });
    socket().open();

    socket().receive(room);
    expect(session.getSnapshot()).toMatchObject({ phase: 'waiting', code: 'AB23' });
    socket().receive({ type: 'state', view });
    expect(session.getSnapshot()).toMatchObject({ phase: 'playing' });
    expect(listener).toHaveBeenCalled();
  });

  it('sends guesses and give ups once open', () => {
    const session = new OnlineSession('ws://host/ws');
    session.start({ type: 'create', setup });
    session.guess({ type: 'text', value: 'early' });
    expect(socket().sent).toEqual([]);

    socket().open();
    session.guess({ type: 'text', value: 'brasil' });
    session.giveUp();

    expect(socket().messages.slice(1)).toEqual([
      { type: 'guess', guess: { type: 'text', value: 'brasil' } },
      { type: 'give_up' },
    ]);
  });

  it('ignores garbage from the server', () => {
    const session = new OnlineSession('ws://host/ws');
    session.start({ type: 'create', setup });

    socket().receive('not json');
    socket().receive({ type: 'state', view: {} });

    expect(session.getSnapshot()).toBe(CONNECTING);
  });

  it('reports a dropped connection', () => {
    const session = new OnlineSession('ws://host/ws');
    session.start({ type: 'create', setup });
    socket().open();
    socket().receive(room);

    socket().onclose?.();

    expect(session.getSnapshot()).toEqual({ phase: 'interrupted', reason: 'connection_lost' });
  });

  it('does not report a connection it closed on purpose, nor events of a replaced one', () => {
    const session = new OnlineSession('ws://host/ws');
    session.start({ type: 'create', setup });
    const first = socket();
    session.start({ type: 'create', setup });

    first.receive(room);
    first.onclose?.();
    expect(session.getSnapshot()).toBe(CONNECTING);

    session.close();
    expect(session.getSnapshot()).toBe(CONNECTING);
  });
});

describe('websocketUrl', () => {
  it('follows the page: secure pages use wss', () => {
    expect(websocketUrl({ protocol: 'https:', host: 'contorno.fvrt.com.br' })).toBe('wss://contorno.fvrt.com.br/ws');
    expect(websocketUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe('ws://localhost:5173/ws');
  });
});
