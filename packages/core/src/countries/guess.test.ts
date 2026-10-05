import { describe, expect, it } from 'vitest';
import { clicked, typed } from '../test-support';
import { getCountry } from './catalog';
import { isCorrectGuess } from './guess';

const brasil = getCountry(76);

describe('isCorrectGuess', () => {
  it('accepts typed aliases ignoring case, accents and punctuation', () => {
    expect(isCorrectGuess(brasil, typed('BRASIL'))).toBe(true);
    expect(isCorrectGuess(brasil, typed(' Brazil! '))).toBe(true);
    expect(isCorrectGuess(getCountry(8), typed('Albânia'))).toBe(true);
  });

  it('rejects other names and empty input', () => {
    expect(isCorrectGuess(brasil, typed('argentina'))).toBe(false);
    expect(isCorrectGuess(brasil, typed(''))).toBe(false);
  });

  it('compares clicked countries by id', () => {
    expect(isCorrectGuess(brasil, clicked(76))).toBe(true);
    expect(isCorrectGuess(brasil, clicked(32))).toBe(false);
  });
});
