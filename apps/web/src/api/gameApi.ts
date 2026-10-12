import {
  finishGameResponseSchema,
  rankingResponseSchema,
  startGameResponseSchema,
  type FinishGameResponse,
  type GameSetup,
  type IndividualEvent,
  type RankingResponse,
  type StartGameResponse,
} from '@contorno/core';
import { request } from './http';

export const gameApi = {
  start: (setup: GameSetup, token: string): Promise<StartGameResponse> =>
    request('/games', { method: 'POST', body: { setup }, token, schema: startGameResponseSchema }),
  finish: (gameId: string, events: readonly IndividualEvent[], token: string): Promise<FinishGameResponse> =>
    request(`/games/${gameId}/finish`, { method: 'POST', body: { events }, token, schema: finishGameResponseSchema }),
  /** `limit` caps the listed entries (1 is enough to read only the player's own best game, in `mine`). */
  ranking: (board: string, token: string | null, limit?: number): Promise<RankingResponse> =>
    request(`/ranking?board=${encodeURIComponent(board)}${limit === undefined ? '' : `&limit=${String(limit)}`}`, {
      token,
      schema: rankingResponseSchema,
    }),
};
