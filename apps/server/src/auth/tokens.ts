import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

const ISSUER = 'contorno';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_BYTES = 32;

export interface RefreshToken {
  /** What the client holds. */
  readonly token: string;
  /** What the server stores: refresh tokens are never kept in the clear. */
  readonly hash: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newRefreshToken(): RefreshToken {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  return { token, hash: hashToken(token) };
}

/** Short-lived signed access tokens (HS256, `sub` = user id). */
export class AccessTokens {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  issue(userId: number): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setSubject(String(userId))
      .setIssuedAt()
      .setExpirationTime(`${String(ACCESS_TOKEN_TTL_SECONDS)}s`)
      .sign(this.key);
  }

  /** The user the token was issued to, or `null` when it is invalid or expired. */
  async verify(token: string): Promise<number | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'], issuer: ISSUER });
      const userId = Number(payload.sub);
      return Number.isInteger(userId) && userId > 0 ? userId : null;
    } catch {
      return null;
    }
  }
}
