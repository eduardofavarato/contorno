import { finishGameRequestSchema, startGameRequestSchema } from '@contorno/core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../auth/guard';
import type { AccessTokens } from '../auth/tokens';
import { parse } from '../http/errors';
import type { GameService } from './gameService';

const START_LIMIT = { max: 30, timeWindow: '1 minute' };

export function registerGameRoutes(app: FastifyInstance, games: GameService, tokens: AccessTokens): void {
  app.post('/api/v1/games', { config: { rateLimit: START_LIMIT } }, async (request, reply) => {
    const userId = await authenticate(request, tokens);
    const { setup } = parse(startGameRequestSchema, request.body);
    return reply.code(201).send(await games.start(userId, setup));
  });

  app.post('/api/v1/games/:id/finish', async (request) => {
    const userId = await authenticate(request, tokens);
    const { id } = parse(z.strictObject({ id: z.uuid() }), request.params);
    const { events } = parse(finishGameRequestSchema, request.body);
    return games.finish(userId, id, events);
  });
}
