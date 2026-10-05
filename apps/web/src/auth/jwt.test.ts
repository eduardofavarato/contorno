import { describe, expect, it } from 'vitest';
import { tokenExpiry } from './jwt';

const encode = (value: object) =>
  btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const token = (payload: object) => `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;

describe('tokenExpiry', () => {
  it('reads the exp claim in milliseconds', () => {
    expect(tokenExpiry(token({ sub: '1', exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it('counts anything unreadable as already expired', () => {
    expect(tokenExpiry('garbage')).toBe(0);
    expect(tokenExpiry(token({ sub: '1' }))).toBe(0);
    expect(tokenExpiry('a.@@@.c')).toBe(0);
  });
});
