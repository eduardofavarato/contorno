import {
  decodeServerMessage,
  encodeMessage,
  getCountry,
  type ClientMessage,
  type CountryId,
  type ServerMessage,
} from '@contorno/core';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { RoomRegistry } from '../rooms/RoomRegistry';
import { rawToString } from './gameSocket';

const ALLOWED_ORIGIN = 'https://contorno.fvrt.com.br';
const setup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } } as const;

let app: FastifyInstance;
let registry: RoomRegistry;
let url: string;
const clients: Client[] = [];

/** A client that queues what the server sends, so tests can wait for messages in order. */
class Client {
  readonly socket: WebSocket;
  private readonly inbox: ServerMessage[] = [];
  private readonly waiters: { type: string; resolve: (message: ServerMessage) => void }[] = [];
  readonly opened: Promise<void>;
  readonly closed: Promise<number>;

  constructor(origin: string | undefined = ALLOWED_ORIGIN) {
    this.socket = new WebSocket(url, origin ? { origin } : {});
    this.socket.on('message', (data) => {
      const message = decodeServerMessage(rawToString(data));
      if (!message) throw new Error(`Server sent an invalid message: ${rawToString(data)}`);
      const waiter = this.waiters.findIndex((entry) => entry.type === message.type);
      if (waiter === -1) this.inbox.push(message);
      else this.waiters.splice(waiter, 1)[0]?.resolve(message);
    });
    this.opened = new Promise((resolve) =>
      this.socket.once('open', () => {
        resolve();
      }),
    );
    // Refused connections (wrong origin) never open; the tests that expect that look at the response instead.
    this.opened.catch(() => undefined);
    // Tearing down a socket that never finished connecting (refused origin) reports an error; nothing to assert there.
    this.socket.on('error', () => undefined);
    this.closed = new Promise((resolve) => this.socket.on('close', resolve));
    clients.push(this);
  }

  /** Sends as soon as the connection is open. */
  send(message: ClientMessage | string): void {
    void this.opened.then(() => {
      this.socket.send(typeof message === 'string' ? message : encodeMessage(message));
    });
  }

  /** Resolves with the next message of `type`, whether it already arrived or not. */
  next<T extends ServerMessage['type']>(type: T): Promise<Extract<ServerMessage, { type: T }>> {
    const queued = this.inbox.findIndex((message) => message.type === type);
    if (queued !== -1) return Promise.resolve(this.inbox.splice(queued, 1)[0] as Extract<ServerMessage, { type: T }>);
    return new Promise((resolve) => this.waiters.push({ type, resolve: resolve as (message: ServerMessage) => void }));
  }
}

function currentCountry(view: { question: { regionId: CountryId } | null }): CountryId {
  if (view.question === null) throw new Error('The duel has no current question');
  return view.question.regionId;
}

async function roomWithTwoPlayers() {
  const host = new Client();
  host.send({ type: 'create', setup });
  const hostRoom = await host.next('room');
  const { code } = hostRoom;

  const guest = new Client();
  guest.send({ type: 'join', room: code.toLowerCase() });
  const guestRoom = await guest.next('room');
  return { host, guest, code, hostRoom, guestRoom };
}

beforeEach(async () => {
  registry = new RoomRegistry({ startDelayMs: 0 });
  app = await buildApp({ allowedOrigins: [ALLOWED_ORIGIN], registry });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Server is not listening');
  url = `ws://127.0.0.1:${String(address.port)}/ws`;
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.socket.terminate();
  await app.close();
});

describe('online duel over WebSocket', () => {
  it('creates a room and lets the opponent join by code, in any case', async () => {
    const { host, guest, code } = await roomWithTwoPlayers();

    expect(code).toMatch(/^[A-Z2-9]{4}$/);
    await host.next('opponent_joined');
    expect((await guest.next('state')).view.activePlayer).toBe(0);
    expect((await host.next('state')).view).toMatchObject({ status: 'asking', stage: 'primary' });
  });

  it('tells each player their seat and the setup of the room', async () => {
    const { hostRoom, guestRoom } = await roomWithTwoPlayers();

    expect(hostRoom).toMatchObject({ player: 0, setup });
    expect(guestRoom).toMatchObject({ player: 1, setup, code: hostRoom.code });
  });

  it('plays a question end to end: the server judges the answer and tells both', async () => {
    const { host, guest } = await roomWithTwoPlayers();
    const { view } = await host.next('state');
    await guest.next('state');
    const countryId = currentCountry(view);

    host.send({ type: 'guess', guess: { type: 'text', value: getCountry(countryId).aliases[0] ?? '' } });

    expect((await host.next('state')).view).toMatchObject({ status: 'resolved', scores: [2000, 0] });
    expect((await guest.next('state')).view).toMatchObject({ status: 'resolved', scores: [2000, 0] });
  });

  it('ignores a guess from the player whose turn it is not', async () => {
    const { host, guest } = await roomWithTwoPlayers();
    const { view } = await host.next('state');
    await guest.next('state');

    guest.send({ type: 'guess', guess: { type: 'region', id: currentCountry(view) } });
    host.send({ type: 'give_up' });

    // The first thing the server reports is the host's give up, so the guest's guess was dropped.
    expect((await host.next('state')).view.resolution).toEqual({ kind: 'primary_failed', gaveUp: true });
  });

  it('tells the remaining player when the opponent leaves', async () => {
    const { host, guest } = await roomWithTwoPlayers();
    await host.next('state');

    guest.socket.close();

    await host.next('opponent_left');
    expect(registry.size).toBe(1);
    host.socket.close();
    await host.closed;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(registry.size).toBe(0);
  });
});

describe('rejections', () => {
  it('answers an unknown room code and closes', async () => {
    const client = new Client();
    client.send({ type: 'join', room: 'ZZZZ' });

    expect(await client.next('error')).toEqual({ type: 'error', code: 'room_not_found' });
    await client.closed;
  });

  it('answers a full room and closes', async () => {
    const { code } = await roomWithTwoPlayers();
    const third = new Client();
    third.send({ type: 'join', room: code });

    expect(await third.next('error')).toEqual({ type: 'error', code: 'room_full' });
    await third.closed;
  });

  it('answers malformed messages with an error and stays connected', async () => {
    const client = new Client();
    await client.opened;

    client.send('this is not json');
    expect(await client.next('error')).toEqual({ type: 'error', code: 'invalid_message' });

    client.send({ type: 'create', setup });
    expect((await client.next('room')).player).toBe(0);
  });

  it('does not let a seated player create or join again', async () => {
    const host = new Client();
    host.send({ type: 'create', setup });
    await host.next('room');

    host.send({ type: 'create', setup });
    expect(await host.next('error')).toEqual({ type: 'error', code: 'invalid_message' });
    expect(registry.size).toBe(1);
  });

  it('drops oversized messages by closing the socket', async () => {
    const client = new Client();
    await client.opened;

    client.socket.send('x'.repeat(5000));

    expect(await client.closed).toBe(1009);
  });

  it('refuses connections from other origins', async () => {
    const client = new Client('https://evil.example');

    const status = await new Promise<number>((resolve) => {
      client.socket.once('unexpected-response', (_request, response) => {
        resolve(response.statusCode ?? 0);
      });
    });
    expect(status).toBe(403);
  });

  it('accepts connections without an Origin header (non-browser clients)', async () => {
    const client = new Client(undefined);
    client.send({ type: 'create', setup });

    expect((await client.next('room')).player).toBe(0);
  });

  it('answers server_busy when the server is at capacity', async () => {
    await app.close();
    registry = new RoomRegistry({ maxRooms: 1 });
    app = await buildApp({ registry });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Server is not listening');
    url = `ws://127.0.0.1:${String(address.port)}/ws`;

    const first = new Client(undefined);
    first.send({ type: 'create', setup });
    await first.next('room');
    const second = new Client(undefined);
    second.send({ type: 'create', setup });

    expect(await second.next('error')).toEqual({ type: 'error', code: 'server_busy' });
  });
});
