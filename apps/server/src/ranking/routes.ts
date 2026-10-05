import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AccessTokens } from '../auth/tokens';
import { parse } from '../http/errors';
import { DEFAULT_RANKING_LIMIT, MAX_RANKING_LIMIT, type RankingService } from './rankingService';

const querySchema = z.object({
  board: z.string().max(64),
  limit: z.coerce.number().int().min(1).max(MAX_RANKING_LIMIT).default(DEFAULT_RANKING_LIMIT),
});

export function registerRankingRoutes(app: FastifyInstance, ranking: RankingService, tokens: AccessTokens): void {
  // Public; a signed-in player also gets their own best game, so they can see where they stand outside the top.
  app.get('/api/v1/ranking', async (request) => {
    const { board, limit } = parse(querySchema, request.query);
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    return ranking.board(board, limit, token ? await tokens.verify(token) : null);
  });
}
