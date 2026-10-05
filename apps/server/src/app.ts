import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { RoomRegistry } from './rooms/RoomRegistry';
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
  readonly logger?: FastifyServerOptions['logger'];
  readonly heartbeatMs?: number;
  readonly sweepMs?: number;
}

/**
 * One process serves the web app and the online duel (WebSocket at /ws), so the browser talks to a single origin.
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const { publicDir, allowedOrigins = [], logger = false, heartbeatMs = 30_000, sweepMs = 60_000 } = options;
  const registry = options.registry ?? new RoomRegistry();
  const app = Fastify({ logger });

  app.addHook('onSend', (_request, reply, payload, done) => {
    reply.headers(SECURITY_HEADERS);
    done(null, payload);
  });

  app.get('/healthz', () => ({ status: 'ok', rooms: registry.size }));

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
