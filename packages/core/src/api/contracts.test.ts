import { describe, expect, it } from 'vitest';
import { finishGameRequestSchema, loginRequestSchema, signupRequestSchema, startGameRequestSchema } from './contracts';

describe('signupRequestSchema', () => {
  const valid = { name: '  Ana  ', email: ' Ana@Example.COM ', password: 'segredo' };

  it('trims the name and lower-cases the e-mail', () => {
    expect(signupRequestSchema.parse(valid)).toEqual({ name: 'Ana', email: 'ana@example.com', password: 'segredo' });
  });

  it.each([
    ['a short name', { ...valid, name: 'A' }],
    ['a long name', { ...valid, name: 'x'.repeat(41) }],
    ['a malformed e-mail', { ...valid, email: 'not-an-email' }],
    ['a short password', { ...valid, password: '12345' }],
    ['a password over 72 bytes', { ...valid, password: 'a'.repeat(73) }],
    ['a multibyte password over 72 bytes', { ...valid, password: 'ç'.repeat(37) }],
    ['unknown fields', { ...valid, admin: true }],
  ])('rejects %s', (_label, body) => {
    expect(signupRequestSchema.safeParse(body).success).toBe(false);
  });

  it('accepts a password of exactly 72 bytes', () => {
    expect(signupRequestSchema.safeParse({ ...valid, password: 'ç'.repeat(36) }).success).toBe(true);
  });
});

describe('loginRequestSchema', () => {
  it('normalizes the e-mail and needs a password', () => {
    expect(loginRequestSchema.parse({ email: 'A@B.CO', password: 'x' }).email).toBe('a@b.co');
    expect(loginRequestSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('game contracts', () => {
  it('checks the setup of a new game', () => {
    const good = { setup: { mode: 'perguntas', pool: { kind: 'level', level: 1 } } };

    expect(startGameRequestSchema.safeParse(good).success).toBe(true);
    expect(
      startGameRequestSchema.safeParse({ setup: { mode: 'perguntas', pool: { kind: 'level', level: 7 } } }).success,
    ).toBe(false);
  });

  it('checks the events of a finished game', () => {
    const events = [{ type: 'guess', guess: { type: 'text', value: 'brasil' } }, { type: 'give_up' }, { type: 'next' }];

    expect(finishGameRequestSchema.safeParse({ events }).success).toBe(true);
    expect(finishGameRequestSchema.safeParse({ events: [{ type: 'cheat' }] }).success).toBe(false);
    expect(finishGameRequestSchema.safeParse({ events: Array(401).fill({ type: 'next' }) }).success).toBe(false);
  });
});
