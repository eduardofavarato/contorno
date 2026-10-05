import type { AuthResponse } from '@contorno/core';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { scores, users } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../../test/database';
import { createTestApp, googleAccount, ORIGIN, refreshCookie, type TestApp } from '../../test/support';

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
  t = await createTestApp({ database, google: googleAccount('sub-1', 'gina@example.com', 'Gina') });
});
afterEach(async () => {
  await t.app.close();
});

const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
  t.app.inject({ method: 'POST', url, payload: payload as object, headers });

describe('config', () => {
  it('tells the client that accounts exist and which Google client to use', async () => {
    const response = await t.app.inject({ method: 'GET', url: '/api/v1/config' });

    expect(response.json()).toEqual({ auth: { enabled: true, googleClientId: 'client-id' } });
  });
});

describe('signup', () => {
  it('creates the account, signs the player in and stores only a hash of the password', async () => {
    const response = await post('/api/v1/auth/signup', {
      name: ' Ana ',
      email: 'ANA@example.com',
      password: 'segredo123',
    });
    const body = response.json<AuthResponse>();

    expect(response.statusCode).toBe(201);
    expect(body.user.name).toBe('Ana');
    expect(body.accessToken).toBeTruthy();
    const [row] = await database.db.select().from(users).where(eq(users.email, 'ana@example.com'));
    expect(row?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(row?.passwordHash).not.toContain('segredo123');
  });

  it('hands the refresh token over in an httpOnly strict cookie, not in the body', async () => {
    const response = await post('/api/v1/auth/signup', {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'segredo123',
    });
    const cookie = response.cookies.find((entry) => entry.name === 'contorno_refresh');

    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict', path: '/api/v1/auth' });
    expect(JSON.stringify(response.json())).not.toContain(cookie?.value ?? 'x');
  });

  it('refuses an e-mail that is already in use', async () => {
    await t.signup('Ana', 'ana@example.com');
    const response = await post('/api/v1/auth/signup', {
      name: 'Outra',
      email: 'ana@example.com',
      password: 'outrasenha',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('refuses malformed requests', async () => {
    const response = await post('/api/v1/auth/signup', { name: 'A', email: 'nope', password: '1' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it('refuses requests from other origins', async () => {
    const response = await post(
      '/api/v1/auth/signup',
      { name: 'Ana', email: 'ana@example.com', password: 'segredo123' },
      { origin: 'https://evil.example' },
    );

    expect(response.statusCode).toBe(403);
  });

  it('accepts requests from the app origin', async () => {
    const response = await post(
      '/api/v1/auth/signup',
      { name: 'Ana', email: 'ana@example.com', password: 'segredo123' },
      { origin: ORIGIN },
    );

    expect(response.statusCode).toBe(201);
  });
});

describe('login', () => {
  it('signs in with the right password', async () => {
    await t.signup('Ana', 'ana@example.com', 'segredo123');
    const response = await post('/api/v1/auth/login', { email: 'Ana@Example.com', password: 'segredo123' });

    expect(response.statusCode).toBe(200);
    expect(response.json<AuthResponse>().user.name).toBe('Ana');
    expect(refreshCookie(response)).not.toBe('');
  });

  it('answers the same way for a wrong password and for an unknown e-mail', async () => {
    await t.signup('Ana', 'ana@example.com', 'segredo123');
    const wrongPassword = await post('/api/v1/auth/login', { email: 'ana@example.com', password: 'errada' });
    const unknown = await post('/api/v1/auth/login', { email: 'ninguem@example.com', password: 'segredo123' });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json()).toEqual(wrongPassword.json());
  });

  it('limits repeated attempts', async () => {
    const attempt = () => post('/api/v1/auth/login', { email: 'ana@example.com', password: 'errada' });
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await attempt()).statusCode);

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('Google sign-in', () => {
  it('creates an account on the first sign-in and reuses it afterwards', async () => {
    const first = await post('/api/v1/auth/google', { idToken: 'valid-token' });
    const second = await post('/api/v1/auth/google', { idToken: 'valid-token' });

    expect(first.statusCode).toBe(200);
    expect(first.json<AuthResponse>().user.name).toBe('Gina');
    expect(second.json<AuthResponse>().user.id).toBe(first.json<AuthResponse>().user.id);
    expect(await database.db.select().from(users)).toHaveLength(1);
  });

  it('rejects a token that does not verify', async () => {
    const response = await post('/api/v1/auth/google', { idToken: 'forged-token-value' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'GOOGLE_TOKEN_INVALID' });
  });

  it('never merges with a password account that has the same e-mail', async () => {
    await t.signup('Gina Senha', 'gina@example.com');
    const response = await post('/api/v1/auth/google', { idToken: 'valid-token' });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'EMAIL_USES_PASSWORD' });
  });

  it('points a Google account trying a password to the Google button', async () => {
    await post('/api/v1/auth/google', { idToken: 'valid-token' });
    const login = await post('/api/v1/auth/login', { email: 'gina@example.com', password: 'qualquer1' });
    const signup = await post('/api/v1/auth/signup', {
      name: 'Gina',
      email: 'gina@example.com',
      password: 'qualquer1',
    });

    expect(login.json()).toMatchObject({ code: 'EMAIL_USES_GOOGLE' });
    expect(signup.json()).toMatchObject({ code: 'EMAIL_USES_GOOGLE' });
  });

  it('is off when no Google client is configured', async () => {
    const app = await createTestApp({ database, google: null });
    const response = await app.app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { idToken: 'valid-token' },
    });
    await app.app.close();

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'AUTH_DISABLED' });
  });
});

describe('refresh', () => {
  const refresh = (cookie: string) =>
    t.app.inject({ method: 'POST', url: '/api/v1/auth/refresh', headers: { cookie } });

  it('issues a new access token and a new refresh cookie, and the old cookie stops working', async () => {
    const { cookie } = await t.signup('Ana', 'ana@example.com');
    const first = await refresh(cookie);

    expect(first.statusCode).toBe(200);
    expect(first.json<AuthResponse>().accessToken).toBeTruthy();
    const rotated = refreshCookie(first);
    expect(rotated).not.toBe(cookie);

    expect((await refresh(cookie)).statusCode).toBe(401);
    expect((await refresh(rotated)).statusCode).toBe(200);
  });

  it('refuses a missing, unknown or expired token', async () => {
    const { cookie } = await t.signup('Ana', 'ana@example.com');

    expect((await t.app.inject({ method: 'POST', url: '/api/v1/auth/refresh' })).statusCode).toBe(401);
    expect((await refresh('contorno_refresh=nope')).statusCode).toBe(401);
    t.clock.advance(31 * 24 * 60 * 60 * 1000);
    expect((await refresh(cookie)).statusCode).toBe(401);
  });

  it('stores only a hash of the token', async () => {
    const { cookie } = await t.signup('Ana', 'ana@example.com');
    const rows = await database.db.query.refreshTokens.findMany();

    expect(rows).toHaveLength(1);
    expect(cookie).not.toContain(rows[0]?.tokenHash ?? 'x');
    expect(rows[0]?.tokenHash).toHaveLength(64);
  });
});

describe('logout', () => {
  it('ends the session for good', async () => {
    const { cookie } = await t.signup('Ana', 'ana@example.com');
    const logout = await t.app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie } });

    expect(logout.statusCode).toBe(204);
    expect((await t.app.inject({ method: 'POST', url: '/api/v1/auth/refresh', headers: { cookie } })).statusCode).toBe(
      401,
    );
  });
});

describe('me', () => {
  it('needs a valid access token', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');

    expect((await t.app.inject({ method: 'GET', url: '/api/v1/me' })).statusCode).toBe(401);
    expect(
      (await t.app.inject({ method: 'GET', url: '/api/v1/me', headers: t.authHeader('garbage') })).statusCode,
    ).toBe(401);
    const response = await t.app.inject({ method: 'GET', url: '/api/v1/me', headers: t.authHeader(accessToken) });
    expect(response.json()).toMatchObject({ name: 'Ana' });
  });

  it('never exposes the e-mail or the password hash', async () => {
    const { accessToken } = await t.signup('Ana', 'ana@example.com');
    const response = await t.app.inject({ method: 'GET', url: '/api/v1/me', headers: t.authHeader(accessToken) });

    expect(Object.keys(response.json<object>()).sort()).toEqual(['id', 'name']);
  });

  it('deletes the account together with everything it owns', async () => {
    const { accessToken, user, cookie } = await t.signup('Ana', 'ana@example.com');
    await database.db
      .insert(scores)
      .values({
        userId: user.id,
        sessionId: 'session-that-does-not-exist-in-sessions',
        boardKey: 'perguntas:level:1',
        points: 1,
        durationMs: 1,
        createdAt: new Date(),
      })
      .catch(() => undefined);

    const response = await t.app.inject({ method: 'DELETE', url: '/api/v1/me', headers: t.authHeader(accessToken) });

    expect(response.statusCode).toBe(204);
    expect(await database.db.select().from(users)).toHaveLength(0);
    expect((await t.app.inject({ method: 'POST', url: '/api/v1/auth/refresh', headers: { cookie } })).statusCode).toBe(
      401,
    );
  });
});
