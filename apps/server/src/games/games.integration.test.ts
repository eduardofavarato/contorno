import type {
  FinishGameResponse,
  GameSetup,
  IndividualEvent,
  RankingResponse,
  StartGameResponse,
} from '@contorno/core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../../test/database';
import { createTestApp, giveUpGame, perfectGame, PERGUNTAS, type TestApp } from '../../test/support';
import { MAX_OPEN_SESSIONS, SESSION_TTL_MS } from './gameService';

let database: TestDatabase;
let t: TestApp;

beforeAll(async () => {
  database = await createTestDatabase();
});
afterAll(async () => {
  await database.close();
});
beforeEach(async () => {
  await database.reset();
  t = await createTestApp({ database });
});
afterEach(async () => {
  await t.app.close();
});

const SECOND = 1000;
const CONTINENTES: GameSetup = { mode: 'continentes', pool: { kind: 'continent', continent: 'oceania' } };

async function start(token: string, setup: GameSetup = PERGUNTAS) {
  const response = await t.app.inject({
    method: 'POST',
    url: '/api/v1/games',
    payload: { setup },
    headers: t.authHeader(token),
  });
  return { response, game: response.json<StartGameResponse>() };
}

const finish = (token: string, gameId: string, events: IndividualEvent[]) =>
  t.app.inject({
    method: 'POST',
    url: `/api/v1/games/${gameId}/finish`,
    payload: { events },
    headers: t.authHeader(token),
  });

/** Plays a whole ranked game taking `seconds` and returns the server's verdict. */
async function play(token: string, seconds: number, setup: GameSetup = PERGUNTAS, events = perfectGame) {
  const { game } = await start(token, setup);
  t.clock.advance(seconds * SECOND);
  const response = await finish(token, game.gameId, events(setup, game));
  return response.json<FinishGameResponse>();
}

const ranking = async (board = 'perguntas:level:1', token?: string, query = '') =>
  (
    await t.app.inject({
      method: 'GET',
      url: `/api/v1/ranking?board=${board}${query}`,
      headers: token ? t.authHeader(token) : {},
    })
  ).json<RankingResponse>();

describe('starting a game', () => {
  it('needs a signed-in player', async () => {
    const response = await t.app.inject({ method: 'POST', url: '/api/v1/games', payload: { setup: PERGUNTAS } });

    expect(response.statusCode).toBe(401);
  });

  it('draws the questions on the server', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const { response, game } = await start(accessToken);

    expect(response.statusCode).toBe(201);
    expect(game.questionIds).toHaveLength(10);
    expect(new Set(game.questionIds).size).toBe(10);
  });

  it('refuses a setup that does not exist', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const response = await t.app.inject({
      method: 'POST',
      url: '/api/v1/games',
      payload: { setup: { mode: 'perguntas', pool: { kind: 'level', level: 9 } } },
      headers: t.authHeader(accessToken),
    });

    expect(response.statusCode).toBe(400);
  });

  it('limits how many games a player can keep open', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    for (let i = 0; i < MAX_OPEN_SESSIONS; i++) await start(accessToken);

    expect((await start(accessToken)).response.statusCode).toBe(429);
  });

  it('forgets games left open for too long', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    for (let i = 0; i < MAX_OPEN_SESSIONS; i++) await start(accessToken);
    t.clock.advance(SESSION_TTL_MS + SECOND);

    expect((await start(accessToken)).response.statusCode).toBe(201);
  });
});

describe('finishing a game', () => {
  it('scores the moves it replays, times the game itself and ranks it', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');

    const result = await play(accessToken, 42);

    expect(result).toEqual({ points: 20_000, durationMs: 42 * SECOND, rank: 1 });
  });

  it('counts the real outcome, whatever the client claims', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const { game } = await start(accessToken);
    t.clock.advance(30 * SECOND);

    const response = await finish(accessToken, game.gameId, giveUpGame(PERGUNTAS, game));

    expect(response.json<FinishGameResponse>().points).toBe(0);
  });

  it('refuses moves that do not make a complete game', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const { game } = await start(accessToken);
    t.clock.advance(30 * SECOND);

    const response = await finish(accessToken, game.gameId, perfectGame(PERGUNTAS, game).slice(0, 6));

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'GAME_REJECTED' });
  });

  it('refuses a game finished faster than a person could', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const { game } = await start(accessToken);
    t.clock.advance(2 * SECOND);

    const response = await finish(accessToken, game.gameId, perfectGame(PERGUNTAS, game));

    expect(response.statusCode).toBe(422);
    expect(await ranking()).toMatchObject({ entries: [] });
  });

  it('spends the session even when the game is refused, so the moves cannot be retried', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const { game } = await start(accessToken);
    t.clock.advance(30 * SECOND);

    await finish(accessToken, game.gameId, []);
    const retry = await finish(accessToken, game.gameId, perfectGame(PERGUNTAS, game));

    expect(retry.statusCode).toBe(409);
    expect(retry.json()).toMatchObject({ code: 'GAME_ALREADY_FINISHED' });
  });

  it('counts a game once', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const { game } = await start(accessToken);
    t.clock.advance(30 * SECOND);
    const events = perfectGame(PERGUNTAS, game);

    expect((await finish(accessToken, game.gameId, events)).statusCode).toBe(200);
    expect((await finish(accessToken, game.gameId, events)).statusCode).toBe(409);
    expect((await ranking()).entries).toHaveLength(1);
  });

  it('refuses a game that took too long', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const { game } = await start(accessToken);
    t.clock.advance(SESSION_TTL_MS + SECOND);

    const response = await finish(accessToken, game.gameId, perfectGame(PERGUNTAS, game));

    expect(response.statusCode).toBe(410);
  });

  it('only lets the owner finish a game', async () => {
    const ana = await t.signup('Ana', 'ana@example.com');
    const beto = await t.signup('Beto', 'beto@example.com');
    const { game } = await start(ana.accessToken);
    t.clock.advance(30 * SECOND);

    const response = await finish(beto.accessToken, game.gameId, perfectGame(PERGUNTAS, game));

    expect(response.statusCode).toBe(404);
  });

  it('refuses unknown games and malformed ids', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');

    expect((await finish(accessToken, '7d0a0b2c-0000-4000-8000-000000000000', [])).statusCode).toBe(404);
    expect((await finish(accessToken, 'not-a-uuid', [])).statusCode).toBe(400);
  });

  it('plays a whole continent when that is the quiz', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');

    const result = await play(accessToken, 30, CONTINENTES);

    expect(result.points).toBe(4 * 2000);
  });
});

describe('ranking', () => {
  it('orders by points, then by time, and shows every game', async () => {
    const ana = await t.signup('Ana', 'ana@example.com');
    const beto = await t.signup('Beto', 'beto@example.com');
    const caio = await t.signup('Caio', 'caio@example.com');

    await play(ana.accessToken, 50);
    await play(beto.accessToken, 40);
    await play(caio.accessToken, 30, PERGUNTAS, giveUpGame);
    await play(ana.accessToken, 45);

    const { entries } = await ranking();

    expect(entries.map(({ rank, name, points, durationMs }) => [rank, name, points, durationMs / SECOND])).toEqual([
      [1, 'Beto', 20_000, 40],
      [2, 'Ana', 20_000, 45],
      [3, 'Ana', 20_000, 50],
      [4, 'Caio', 0, 30],
    ]);
  });

  it('keeps boards apart', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    await play(accessToken, 30);

    expect((await ranking('perguntas:level:1')).entries).toHaveLength(1);
    expect((await ranking('perguntas:level:2')).entries).toHaveLength(0);
    expect((await ranking('continentes:continent:oceania')).entries).toHaveLength(0);
  });

  it('is public and only exposes names', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    await play(accessToken, 30);

    const response = await t.app.inject({ method: 'GET', url: '/api/v1/ranking?board=perguntas:level:1' });

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json<RankingResponse>().entries[0] ?? {}).sort()).toEqual([
      'durationMs',
      'finishedAt',
      'name',
      'points',
      'rank',
      'userId',
    ]);
    expect(response.body).not.toContain('example.com');
  });

  it('shows a signed-in player where they stand even outside the listed top', async () => {
    const ana = await t.signup('Ana', 'ana@example.com');
    const beto = await t.signup('Beto', 'beto@example.com');
    await play(beto.accessToken, 20);
    await play(beto.accessToken, 21);
    await play(ana.accessToken, 50);

    const response = await ranking('perguntas:level:1', ana.accessToken, '&limit=2');

    expect(response.entries.map((entry) => entry.name)).toEqual(['Beto', 'Beto']);
    expect(response.mine).toMatchObject({ name: 'Ana', rank: 3, points: 20_000 });
  });

  it('has no personal entry for anonymous visitors or players without games', async () => {
    const ana = await t.signup('Ana', 'ana@example.com');

    expect((await ranking()).mine).toBeNull();
    expect((await ranking('perguntas:level:1', ana.accessToken)).mine).toBeNull();
  });

  it('refuses boards that do not exist and absurd limits', async () => {
    const unknown = await t.app.inject({ method: 'GET', url: '/api/v1/ranking?board=hack' });
    const huge = await t.app.inject({ method: 'GET', url: '/api/v1/ranking?board=perguntas:level:1&limit=5000' });

    expect(unknown.statusCode).toBe(400);
    expect(huge.statusCode).toBe(400);
  });

  it('removes a deleted account from the ranking', async () => {
    const ana = await t.signup('Ana', 'ana@example.com');
    await play(ana.accessToken, 30);

    await t.app.inject({ method: 'DELETE', url: '/api/v1/me', headers: t.authHeader(ana.accessToken) });

    expect((await ranking()).entries).toHaveLength(0);
  });
});
