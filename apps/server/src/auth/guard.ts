import type { FastifyRequest } from 'fastify';
import { unauthorized } from '../http/errors';
import type { AccessTokens } from './tokens';

/** The id of the signed-in user, from the `Authorization: Bearer` access token. */
export async function authenticate(request: FastifyRequest, tokens: AccessTokens): Promise<number> {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  const userId = token ? await tokens.verify(token) : null;
  if (userId === null) throw unauthorized();
  return userId;
}
