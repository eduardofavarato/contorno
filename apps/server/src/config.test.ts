import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const SECRET = 'x'.repeat(32);

describe('loadConfig', () => {
  it('runs without accounts when there is no database', () => {
    expect(loadConfig({}).accounts).toBeNull();
  });

  it('turns accounts on when the database and a secret are given', () => {
    const { accounts } = loadConfig({
      DATABASE_URL: 'mysql://u:p@mysql:3306/contorno',
      JWT_SECRET: SECRET,
      GOOGLE_CLIENT_ID: 'a.apps.googleusercontent.com, b.apps.googleusercontent.com',
    });

    expect(accounts).toEqual({
      databaseUrl: 'mysql://u:p@mysql:3306/contorno',
      jwtSecret: SECRET,
      googleClientIds: ['a.apps.googleusercontent.com', 'b.apps.googleusercontent.com'],
      migrationsDir: 'drizzle',
    });
  });

  it('leaves Google off when no client id is given', () => {
    const { accounts } = loadConfig({ DATABASE_URL: 'mysql://x', JWT_SECRET: SECRET, GOOGLE_CLIENT_ID: '' });

    expect(accounts?.googleClientIds).toEqual([]);
  });

  it('refuses to start with a database but a weak secret', () => {
    expect(() => loadConfig({ DATABASE_URL: 'mysql://x', JWT_SECRET: 'short' })).toThrow('JWT_SECRET');
    expect(() => loadConfig({ DATABASE_URL: 'mysql://x' })).toThrow('JWT_SECRET');
  });

  it('parses the plain settings', () => {
    expect(
      loadConfig({ PORT: '9000', ALLOWED_ORIGINS: 'https://a, https://b', PUBLIC_DIR: '/app/public' }),
    ).toMatchObject({
      port: 9000,
      allowedOrigins: ['https://a', 'https://b'],
      publicDir: '/app/public',
    });
  });
});
