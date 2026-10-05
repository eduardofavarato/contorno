import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiException } from '../http/errors';

export interface GoogleIdentity {
  /** Google's stable id for the account. */
  readonly sub: string;
  readonly email: string;
  readonly name: string;
}

export interface GoogleIdentityVerifier {
  /** Checks a Google ID token and returns who it belongs to; throws `GOOGLE_TOKEN_INVALID` otherwise. */
  verify(idToken: string): Promise<GoogleIdentity>;
}

const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export function createGoogleVerifier(clientIds: readonly string[]): GoogleIdentityVerifier {
  const keys = createRemoteJWKSet(GOOGLE_JWKS_URL);
  return {
    async verify(idToken) {
      try {
        const { payload } = await jwtVerify(idToken, keys, { issuer: GOOGLE_ISSUERS, audience: [...clientIds] });
        const { sub, email, email_verified: verified, name } = payload as Record<string, unknown>;
        if (typeof sub !== 'string' || typeof email !== 'string' || verified !== true)
          throw new Error('Unverified identity');
        return { sub, email: email.toLowerCase(), name: typeof name === 'string' ? name : '' };
      } catch {
        throw new ApiException('GOOGLE_TOKEN_INVALID', 401, 'Não foi possível validar o login com o Google.');
      }
    },
  };
}
