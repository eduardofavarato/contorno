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
  ranking: (board: string, token: string | null): Promise<RankingResponse> =>
    request(`/ranking?board=${encodeURIComponent(board)}`, { token, schema: rankingResponseSchema }),
};
