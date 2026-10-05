import { describe, expect, it } from 'vitest';
import { formatDuration, formatPoints, plural } from './format';

describe('formatPoints', () => {
  it('uses the pt-BR thousands separator', () => {
    expect(formatPoints(2000)).toBe('2.000');
    expect(formatPoints(0)).toBe('0');
  });
});

describe('plural', () => {
  it('picks the singular only for one', () => {
    expect(plural(1, 'erro')).toBe('1 erro');
    expect(plural(0, 'erro')).toBe('0 erros');
    expect(plural(2, 'erro')).toBe('2 erros');
  });

  it('accepts an explicit plural form', () => {
    expect(plural(2, 'restante', 'restantes')).toBe('2 restantes');
    expect(plural(2, 'tentativa restante', 'tentativas restantes')).toBe('2 tentativas restantes');
  });
});

describe('formatDuration', () => {
  it('writes minutes and zero-padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5_000)).toBe('0:05');
    expect(formatDuration(62_000)).toBe('1:02');
    expect(formatDuration(600_999)).toBe('10:00');
  });
});
