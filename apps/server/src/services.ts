import { type Random } from '@contorno/core';
import { randomInt } from 'node:crypto';
import { AuthService } from './auth/authService';
import { createGoogleVerifier, type GoogleIdentityVerifier } from './auth/google';
import { createPasswordHasher, type PasswordHasher } from './auth/passwords';
import { AccessTokens } from './auth/tokens';
import type { AccountsConfig } from './config';
import { connectDatabase, type Database, type Db } from './db/client';
import { GameService } from './games/gameService';
import { RankingService } from './ranking/rankingService';

/** Everything behind login and ranking; only exists when the server has a database. */
export interface AccountServices {
  readonly auth: AuthService;
  readonly games: GameService;
  readonly ranking: RankingService;
  readonly tokens: AccessTokens;
  readonly googleClientId: string | null;
}

export interface ServiceOverrides {
  readonly hasher?: PasswordHasher;
  readonly google?: GoogleIdentityVerifier | null;
  readonly random?: Random;
  readonly now?: () => Date;
}

/** Cryptographically strong draws: games decide ranked positions, so questions must not be guessable. */
const secureRandom: Random = () => randomInt(2 ** 32) / 2 ** 32;

export function createAccountServices(
  db: Db,
  config: Pick<AccountsConfig, 'jwtSecret' | 'googleClientIds'>,
  overrides: ServiceOverrides = {},
): AccountServices {
  const now = overrides.now ?? (() => new Date());
  const tokens = new AccessTokens(config.jwtSecret);
  const google =
    overrides.google !== undefined
      ? overrides.google
      : config.googleClientIds.length > 0
        ? createGoogleVerifier(config.googleClientIds)
        : null;
  return {
    auth: new AuthService({ db, hasher: overrides.hasher ?? createPasswordHasher(), tokens, google, now }),
    games: new GameService({ db, random: overrides.random ?? secureRandom, now }),
    ranking: new RankingService(db),
    tokens,
    googleClientId: config.googleClientIds[0] ?? null,
  };
}

export async function connectAccounts(
  config: AccountsConfig,
): Promise<{ services: AccountServices; database: Database }> {
  const database = await connectDatabase(config.databaseUrl, config.migrationsDir);
  return { services: createAccountServices(database.db, config), database };
}
