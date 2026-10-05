import { describe, expect, it } from 'vitest';
import { isCorrectGuess, matchesAnswer, toQuestionInfo, toQuestionPrompt, type Question } from './question';

const typing: Question = {
  id: 1,
  regionId: 76,
  prompt: null,
  subject: 'Brasil',
  answer: 'Brasil',
  challenge: 'type',
  accepts: ['brasil', 'brazil'],
};
const locating: Question = { ...typing, prompt: 'Brasil', challenge: 'click', accepts: [] };

describe('matchesAnswer', () => {
  it('ignores case, accents and punctuation', () => {
    expect(matchesAnswer(['sao paulo'], ' São  PAULO! ')).toBe(true);
    expect(matchesAnswer(['brasil', 'brazil'], 'Brazil')).toBe(true);
  });

  it('rejects other answers and empty input', () => {
    expect(matchesAnswer(['brasil'], 'argentina')).toBe(false);
    expect(matchesAnswer(['brasil'], '')).toBe(false);
  });
});

describe('isCorrectGuess', () => {
  it('accepts a typed answer to a typing question', () => {
    expect(isCorrectGuess(typing, { type: 'text', value: 'BRASIL' })).toBe(true);
    expect(isCorrectGuess(typing, { type: 'text', value: 'peru' })).toBe(false);
  });

  it('accepts the right region for a locating question', () => {
    expect(isCorrectGuess(locating, { type: 'region', id: 76 })).toBe(true);
    expect(isCorrectGuess(locating, { type: 'region', id: 32 })).toBe(false);
  });

  it('does not let a guess of the wrong kind through', () => {
    // Clicking the highlighted region must not answer a question that asks for a name...
    expect(isCorrectGuess(typing, { type: 'region', id: 76 })).toBe(false);
    // ...and a locating question has no typed answers.
    expect(isCorrectGuess(locating, { type: 'text', value: 'brasil' })).toBe(false);
  });
});

describe('projections', () => {
  it('hides the accepted answers', () => {
    expect(toQuestionInfo(typing)).toEqual({ id: 1, regionId: 76, prompt: null, subject: 'Brasil', answer: 'Brasil' });
    expect(toQuestionPrompt(typing)).toEqual({ id: 1, regionId: 76, prompt: null });
  });
});
