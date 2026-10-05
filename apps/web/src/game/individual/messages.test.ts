import type { IndividualResult } from '@contorno/core';
import { describe, expect, it } from 'vitest';
import { resolutionDelayMs, resolutionFeedback, wrongGuessFeedback, wrongsLabel } from './messages';

const BRASIL = 76;
const result = (overrides: Partial<IndividualResult>): IndividualResult => ({
  question: { id: BRASIL, regionId: BRASIL, prompt: null, subject: 'Brasil', answer: 'Brasil' },
  outcome: 'correct',
  wrongs: 0,
  points: 2000,
  ...overrides,
});

describe('wrongGuessFeedback', () => {
  it('counts the attempts left', () => {
    expect(wrongGuessFeedback('type', 1).text).toBe('✗ Incorreto. 2 tentativas restantes.');
    expect(wrongGuessFeedback('click', 2).text).toBe('✗ Não é esse! 1 tentativa restante.');
  });
});

describe('wrongsLabel', () => {
  it('is empty before the first mistake', () => {
    expect(wrongsLabel(0)).toBe('');
    expect(wrongsLabel(1)).toBe('1 erro · 2 restantes');
    expect(wrongsLabel(2)).toBe('2 erros · 1 restante');
  });
});

describe('resolutionFeedback', () => {
  it('celebrates a first-try answer', () => {
    expect(resolutionFeedback(result({}), 'type')).toEqual({ text: '✓ Correto! +2.000 pontos', tone: 'ok' });
  });

  it('mentions the mistakes of a late answer', () => {
    expect(resolutionFeedback(result({ wrongs: 2, points: 1600 }), 'type').text).toBe(
      '✓ Correto! +1.600 pontos (2 erros)',
    );
  });

  it('reveals the country after failing', () => {
    expect(resolutionFeedback(result({ outcome: 'failed', wrongs: 3, points: 0 }), 'type')).toEqual({
      text: '✗ Era: Brasil. Tentativas esgotadas.',
      tone: 'bad',
    });
  });

  it('words a give up per challenge', () => {
    const gaveUp = result({ outcome: 'gave_up', points: 0 });

    expect(resolutionFeedback(gaveUp, 'type').text).toBe('Era: Brasil. +0 pontos');
    expect(resolutionFeedback(gaveUp, 'click').text).toBe('Revelado: Brasil. +0 pontos');
  });
});

describe('resolutionDelayMs', () => {
  it('is shorter for right answers and longer when locating a missed country', () => {
    expect(resolutionDelayMs(result({}), 'type')).toBe(1600);
    expect(resolutionDelayMs(result({ outcome: 'failed' }), 'type')).toBe(2000);
    expect(resolutionDelayMs(result({ outcome: 'failed' }), 'click')).toBe(2500);
  });
});
