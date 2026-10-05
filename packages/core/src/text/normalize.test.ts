import { describe, expect, it } from 'vitest';
import { normalize } from './normalize';

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('Albânia')).toBe('albania');
  });

  it('replaces punctuation with spaces and collapses whitespace', () => {
    expect(normalize('  Bósnia-e   Herzegovina. ')).toBe('bosnia e herzegovina');
  });

  it('returns an empty string when nothing alphanumeric is left', () => {
    expect(normalize(' ?! ')).toBe('');
  });
});
