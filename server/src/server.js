import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { Player, RoomRegistry } from './rooms.js';

const MAX_MESSAGE_BYTES = 1024;
const MAX_ANSWER_LENGTH = 80;
const LEVELS = new Set([1, 2, 3]);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

/**
 * One process serves the web app (GET /) and the online duel (WebSocket at /ws), so the browser talks to a single
 * origin. Protocol: `/ws?intent=create&level=1` answers `room_created`; `/ws?intent=join&room=ABCD` joins it.
 */
export function createContornoServer({
  publicDir,
  allowedOrigins = [],
  heartbeatMs = 30_000,
  sweepMs = 60_000,
  registry = new RoomRegistry(),
  log = message => console.log(JSON.stringify({ time: new Date().toISOString(), ...message })),
}) {
  const indexPath = path.join(publicDir, 'index.html');

  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && pathname === '/healthz') {
      respond(res, 200, 'application/json', JSON.stringify({ status: 'ok', rooms: registry.size }));
      return;
    }
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      try {
        respond(res, 200, 'text/html; charset=utf-8', await readFile(indexPath), { 'Cache-Control': 'no-cache' });
      } catch {
        respond(res, 503, 'text/plain; charset=utf-8', 'Web app not built');
      }
      return;
    }
    respond(res, 404, 'text/plain; charset=utf-8', 'Not found');
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    const origin = req.headers.origin;
    if (url.pathname !== '/ws' || (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin))) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => onConnection(ws, url.searchParams));
  });

  function onConnection(ws, params) {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const player = new Player({
      send: message => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
      },
      close: () => ws.close(),
    });

    const room = enterRoom(player, params);
    if (!room) {
      ws.close();
      return;
    }

    ws.on('message', data => {
      const message = parseMessage(data);
      if (message) room.handle(player, message);
    });
    ws.on('close', () => {
      room.leave(player);
      registry.release(room);
    });
  }

  function enterRoom(player, params) {
    const intent = params.get('intent');
    if (intent === 'create') {
      const level = Number(params.get('level'));
      if (!LEVELS.has(level)) return reject(player, 'invalid_level');
      const room = registry.create(level);
      player.send({ type: 'room_created', code: room.code });
      room.join(player);
      log({ event: 'room_created', room: room.code, level });
      return room;
    }
    if (intent === 'join') {
      const room = registry.get(params.get('room') ?? '');
      if (!room) return reject(player, 'room_not_found');
      if (room.join(player) === -1) return reject(player, 'room_full');
      log({ event: 'room_joined', room: room.code });
      return room;
    }
    return reject(player, 'invalid_intent');
  }

  function reject(player, type) {
    player.send({ type });
    return null;
  }

  // Phones that vanish (lost signal, app killed) never send a close frame; the ping reveals them.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, heartbeatMs);
  const sweep = setInterval(() => registry.sweep(), sweepMs);

  function close() {
    clearInterval(heartbeat);
    clearInterval(sweep);
    registry.dispose();
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    return new Promise(resolve => server.close(() => resolve()));
  }

  return { server, registry, close };
}

/** Malformed input is dropped, never thrown: one bad message must not take down every other game. */
function parseMessage(data) {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch {
    return null;
  }
  if (message?.type === 'give_up') return { type: 'give_up' };
  if (message?.type === 'answer' && typeof message.value === 'string' && message.value.length <= MAX_ANSWER_LENGTH) {
    return { type: 'answer', value: message.value };
  }
  return null;
}

function respond(res, status, contentType, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': contentType, ...SECURITY_HEADERS, ...headers });
  res.end(body);
}
