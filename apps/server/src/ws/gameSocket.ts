import { decodeClientMessage, encodeMessage, type ClientMessage, type GameSetup } from '@contorno/core';
import type { FastifyBaseLogger } from 'fastify';
import type { RawData, WebSocket } from 'ws';
import type { Connection } from '../rooms/connection';
import type { Room } from '../rooms/Room';
import type { RoomRegistry } from '../rooms/RoomRegistry';

/** A client must say what it wants (create or join a room) soon after connecting, or it is dropped. */
const HANDSHAKE_TIMEOUT_MS = 10_000;

export interface AliveSocket extends WebSocket {
  isAlive?: boolean;
}

interface SocketContext {
  readonly registry: RoomRegistry;
  readonly log: FastifyBaseLogger;
}

/**
 * One player's WebSocket. The first message creates or joins a room; after that only `guess` and `give_up` count.
 * Malformed input is answered with an error and dropped, never thrown: one bad client must not affect other games.
 */
export function handleGameSocket(socket: AliveSocket, { registry, log }: SocketContext): void {
  socket.isAlive = true;
  socket.on('pong', () => {
    socket.isAlive = true;
  });

  const connection: Connection = {
    send: (message) => {
      if (socket.readyState === socket.OPEN) socket.send(encodeMessage(message));
    },
    close: () => {
      socket.close();
    },
  };
  let room: Room | null = null;

  const reject = (code: 'room_not_found' | 'room_full' | 'server_busy' | 'invalid_message', closeAfter: boolean) => {
    connection.send({ type: 'error', code });
    if (closeAfter) socket.close();
  };

  const create = (setup: GameSetup) => {
    const created = registry.create(setup);
    if (!created) {
      reject('server_busy', true);
      return;
    }
    room = created;
    created.join(connection);
    log.info({ event: 'room_created', room: created.code, setup });
  };

  const join = (code: string) => {
    const found = registry.get(code);
    if (!found) {
      reject('room_not_found', true);
    } else if (found.join(connection) === null) {
      reject('room_full', true);
    } else {
      room = found;
      log.info({ event: 'room_joined', room: found.code });
    }
  };

  const enter = (message: ClientMessage) => {
    if (message.type === 'create') create(message.setup);
    else if (message.type === 'join') join(message.room);
    else reject('invalid_message', false);
  };

  const handshakeTimer = setTimeout(() => {
    if (!room) socket.close();
  }, HANDSHAKE_TIMEOUT_MS);

  socket.on('message', (data: RawData) => {
    const message = decodeClientMessage(rawToString(data));
    if (!message) reject('invalid_message', false);
    else if (!room) enter(message);
    else if (message.type === 'guess') room.guess(connection, message.guess);
    else if (message.type === 'give_up') room.giveUp(connection);
    else reject('invalid_message', false);
  });

  socket.on('close', () => {
    clearTimeout(handshakeTimer);
    if (room) {
      room.leave(connection);
      registry.release(room);
    }
  });
}

/** Frames may arrive as one buffer or several; the protocol is text, so both decode as UTF-8. */
export function rawToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return Buffer.from(data as ArrayBuffer).toString('utf8');
}
