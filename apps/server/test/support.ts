import {
  questionsFor,
  type AuthResponse,
  type GameSetup,
  type IndividualEvent,
  type StartGameResponse,
} from '@contorno/core';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app';
import { ApiException } from '../src/http/errors';
import type { GoogleIdentityVerifier } from '../src/auth/google';
import { createPasswordHasher } from '../src/auth/passwords';
import { createAccountServices } from '../src/services';
import type { TestDatabase } from './database';

export const ORIGIN = 'https://contorno.fvrt.com.br';
export const PERGUNTAS: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };

/** A clock the tests move by hand, so game durations are exact. */
export class FakeClock {
  private current = new Date('2026-01-01T12:00:00.000Z');
  readonly now = () => new Date(this.current);

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export const googleAccount = (sub: string, email: string, name = 'Google User'): GoogleIdentityVerifier => ({
  verify: (idToken) =>
    idToken === 'valid-token'
      ? Promise.resolve({ sub, email, name })
      : Promise.reject(new ApiException('GOOGLE_TOKEN_INVALID', 401, 'Token inválido.')),
});

interface TestAppOptions {
  readonly database: TestDatabase;
  readonly clock?: FakeClock;
  readonly google?: GoogleIdentityVerifier | null;
}

export interface TestApp {
  readonly app: FastifyInstance;
  readonly clock: FakeClock;
  signup(name: string, email: string, password?: string): Promise<AuthResponse & { cookie: string }>;
  authHeader(token: string): Record<string, string>;
}

export async function createTestApp({
  database,
  clock = new FakeClock(),
  google = null,
}: TestAppOptions): Promise<TestApp> {
  const accounts = createAccountServices(
    database.db,
    { jwtSecret: 'test-secret-test-secret-test-secret!', googleClientIds: google ? ['client-id'] : [] },
    { hasher: createPasswordHasher(4), google, random: () => 0, now: clock.now },
  );
  const app = await buildApp({ accounts, allowedOrigins: [ORIGIN], secureCookies: true });

  return {
    app,
    clock,
    async signup(name, email, password = 'segredo123') {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { name, email, password },
      });
      return { ...response.json<AuthResponse>(), cookie: refreshCookie(response) };
    },
    authHeader: (token) => ({ authorization: `Bearer ${token}` }),
  };
}

/** The `name=value` of the refresh cookie a response set, ready to send back. */
export function refreshCookie(response: LightMyRequestResponse): string {
  const cookie = response.cookies.find((entry) => entry.name === 'contorno_refresh');
  return cookie ? `${cookie.name}=${cookie.value}` : '';
}

/** The moves of a game played perfectly: every question answered right the first time. */
export function perfectGame(setup: GameSetup, { questionIds }: StartGameResponse): IndividualEvent[] {
  const questions = questionsFor(setup, questionIds);
  if (!questions) throw new Error('Unknown questions');
  return questions.flatMap((question): IndividualEvent[] => [
    { type: 'guess', guess: { type: 'text', value: question.accepts[0] ?? '' } },
    { type: 'next' },
  ]);
}

/** A game where every question is given up: it finishes with no points. */
export function giveUpGame(setup: GameSetup, { questionIds }: StartGameResponse): IndividualEvent[] {
  return questionIds.flatMap((): IndividualEvent[] => [{ type: 'give_up' }, { type: 'next' }]);
}
