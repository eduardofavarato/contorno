export interface Config {
  readonly port: number;
  readonly host: string;
  /** Folder with the built web app; when unset, only the API and WebSocket are served. */
  readonly publicDir: string | undefined;
  /** Origins allowed to open the WebSocket and to call the API; empty means any (local development). */
  readonly allowedOrigins: readonly string[];
  /** Login and ranking; `null` leaves them off, so the server still runs without a database. */
  readonly accounts: AccountsConfig | null;
}

export interface AccountsConfig {
  /** `mysql://user:password@host:3306/database` */
  readonly databaseUrl: string;
  /** HS256 key for access tokens. */
  readonly jwtSecret: string;
  /** OAuth client ids whose Google ID tokens are accepted; empty turns Google sign-in off. */
  readonly googleClientIds: readonly string[];
  /** Where the SQL migrations live. */
  readonly migrationsDir: string;
}

export const MIN_JWT_SECRET_LENGTH = 32;

const list = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const databaseUrl = env.DATABASE_URL;
  const jwtSecret = env.JWT_SECRET;
  if (databaseUrl && (jwtSecret?.length ?? 0) < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must have at least ${String(MIN_JWT_SECRET_LENGTH)} characters when DATABASE_URL is set`,
    );
  }

  return {
    port: Number(env.PORT ?? 8080),
    host: env.HOST ?? '0.0.0.0',
    publicDir: env.PUBLIC_DIR === '' ? undefined : env.PUBLIC_DIR,
    allowedOrigins: list(env.ALLOWED_ORIGINS),
    accounts:
      databaseUrl && jwtSecret
        ? {
            databaseUrl,
            jwtSecret,
            googleClientIds: list(env.GOOGLE_CLIENT_ID),
            migrationsDir: env.MIGRATIONS_DIR ?? 'drizzle',
          }
        : null,
  };
}
