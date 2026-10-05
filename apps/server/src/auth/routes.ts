import { googleLoginRequestSchema, loginRequestSchema, signupRequestSchema, type AuthResponse } from '@contorno/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApiException, parse, unauthorized } from '../http/errors';
import type { AuthService, Session } from './authService';
import { authenticate } from './guard';
import { REFRESH_TOKEN_TTL_MS, type AccessTokens } from './tokens';

const REFRESH_COOKIE = 'contorno_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const CREDENTIAL_LIMIT = { max: 10, timeWindow: '1 minute' };
const REFRESH_LIMIT = { max: 60, timeWindow: '1 minute' };

interface AuthRoutesOptions {
  readonly auth: AuthService;
  readonly tokens: AccessTokens;
  readonly allowedOrigins: readonly string[];
  /** Browsers only send `Secure` cookies over HTTPS (localhost aside), so this is off only in plain-HTTP development. */
  readonly secureCookies: boolean;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  { auth, tokens, allowedOrigins, secureCookies }: AuthRoutesOptions,
): void {
  /** Cookie-authenticated POSTs must come from our own pages. */
  const requireOwnOrigin = (request: FastifyRequest) => {
    const { origin } = request.headers;
    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      throw new ApiException('UNAUTHORIZED', 403, 'Origem não permitida.');
    }
  };

  const setRefreshCookie = (reply: FastifyReply, token: string) => {
    void reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_TOKEN_TTL_MS / 1000,
    });
  };

  const clearRefreshCookie = (reply: FastifyReply) => {
    void reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  };

  const respond = (reply: FastifyReply, session: Session, status = 200): AuthResponse => {
    setRefreshCookie(reply, session.refreshToken);
    void reply.code(status);
    return { accessToken: session.accessToken, user: session.user };
  };

  app.post('/api/v1/auth/signup', { config: { rateLimit: CREDENTIAL_LIMIT } }, async (request, reply) => {
    requireOwnOrigin(request);
    return respond(reply, await auth.signup(parse(signupRequestSchema, request.body)), 201);
  });

  app.post('/api/v1/auth/login', { config: { rateLimit: CREDENTIAL_LIMIT } }, async (request, reply) => {
    requireOwnOrigin(request);
    return respond(reply, await auth.login(parse(loginRequestSchema, request.body)));
  });

  app.post('/api/v1/auth/google', { config: { rateLimit: CREDENTIAL_LIMIT } }, async (request, reply) => {
    requireOwnOrigin(request);
    const { idToken } = parse(googleLoginRequestSchema, request.body);
    return respond(reply, await auth.loginWithGoogle(idToken));
  });

  app.post('/api/v1/auth/refresh', { config: { rateLimit: REFRESH_LIMIT } }, async (request, reply) => {
    requireOwnOrigin(request);
    const token = request.cookies[REFRESH_COOKIE];
    if (!token) throw unauthorized('Sem sessão.');
    try {
      return respond(reply, await auth.refresh(token));
    } catch (error) {
      clearRefreshCookie(reply);
      throw error;
    }
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    requireOwnOrigin(request);
    const token = request.cookies[REFRESH_COOKIE];
    if (token) await auth.logout(token);
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });

  app.get('/api/v1/me', async (request) => {
    const user = await auth.getUser(await authenticate(request, tokens));
    if (!user) throw unauthorized();
    return user;
  });

  app.delete('/api/v1/me', async (request, reply) => {
    requireOwnOrigin(request);
    await auth.deleteAccount(await authenticate(request, tokens));
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });
}
