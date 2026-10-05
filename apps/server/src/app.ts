import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { ServerConfig } from '@contorno/core';
import { registerAuthRoutes } from './auth/routes';
import { registerGameRoutes } from './games/routes';
import { registerErrorHandler } from './http/errors';
import { registerRankingRoutes } from './ranking/routes';
import { RoomRegistry } from './rooms/RoomRegistry';
import type { AccountServices } from './services';
import { handleGameSocket, type AliveSocket } from './ws/gameSocket';

/** Messages are tiny (a guess is well under 200 bytes); anything bigger is not from this game. */
const MAX_MESSAGE_BYTES = 1024;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
} as const;

export interface AppOptions {
  /** Folder with the built web app. */
  readonly publicDir?: string | undefined;
  readonly allowedOrigins?: readonly string[];
  readonly registry?: RoomRegistry;
  /** Login and ranking; without them the server only hosts the game. */
  readonly accounts?: AccountServices | null;
  /** Mark the refresh cookie `Secure`; leave off only for plain-HTTP development. */
  readonly secureCookies?: boolean;
  readonly logger?: FastifyServerOptions['logger'];
  readonly heartbeatMs?: number;
  readonly sweepMs?: number;
}

/**
 * One process serves the web app and the online duel (WebSocket at /ws), so the browser talks to a single origin.
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const {
    publicDir,
    allowedOrigins = [],
    logger = false,
    heartbeatMs = 30_000,
    sweepMs = 60_000,
    accounts = null,
    secureCookies = true,
  } = options;
  const registry = options.registry ?? new RoomRegistry();
  // Behind Cloudflare's tunnel the client address arrives in X-Forwarded-For, which rate limits must use.
  const app = Fastify({ logger, trustProxy: true });
  registerErrorHandler(app);

  app.addHook('onSend', (_request, reply, payload, done) => {
    reply.headers(SECURITY_HEADERS);
    done(null, payload);
  });

  app.get('/healthz', () => ({ status: 'ok', rooms: registry.size }));

  app.get('/api/v1/config', (): ServerConfig => ({
    auth: { enabled: accounts !== null, googleClientId: accounts?.googleClientId ?? null },
  }));

  if (accounts) {
    await app.register(fastifyCookie);
    await app.register(fastifyRateLimit, { global: false });
    registerAuthRoutes(app, { auth: accounts.auth, tokens: accounts.tokens, allowedOrigins, secureCookies });
    registerGameRoutes(app, accounts.games, accounts.tokens);
    registerRankingRoutes(app, accounts.ranking, accounts.tokens);
  }

  await app.register(fastifyWebsocket, { options: { maxPayload: MAX_MESSAGE_BYTES } });
  app.get(
    '/ws',
    {
      websocket: true,
      // Browsers always send Origin; refusing foreign ones keeps other sites from opening sockets for their visitors.
      onRequest: (request, reply, done) => {
        const { origin } = request.headers;
        if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
          void reply.code(403).send();
          return;
        }
        done();
      },
    },
    (socket: AliveSocket) => {
      handleGameSocket(socket, { registry, log: app.log });
    },
  );

  if (publicDir) {
    await app.register(fastifyStatic, {
      root: publicDir,
      setHeaders: (response, filePath) => {
        // Hashed bundles never change; the page that points to them must always be revalidated.
        const immutable = filePath.includes('/assets/');
        response.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/ws')) return reply.sendFile('index.html');
      return reply.code(404).send({ error: 'Not found' });
    });
  }

  // Phones that vanish (lost signal, app killed) never send a close frame; the ping reveals them.
  const heartbeat = setInterval(() => {
    for (const client of app.websocketServer.clients as Set<AliveSocket>) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, heartbeatMs);
  const sweep = setInterval(() => {
    registry.sweep();
  }, sweepMs);

  app.addHook('onClose', (_instance, done) => {
    clearInterval(heartbeat);
    clearInterval(sweep);
    registry.dispose();
    done();
  });

  return app;
}
