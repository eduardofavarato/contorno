import { describe, expect, it } from 'vitest';
import { questionTitle } from './question';

const base = { id: 1, regionId: 1, prompt: null };

describe('questionTitle', () => {
  it('is just the name when the answer is the subject', () => {
    expect(questionTitle({ ...base, subject: 'Brasil', answer: 'Brasil' })).toBe('Brasil');
  });

  it('shows what was asked and its answer otherwise', () => {
    expect(questionTitle({ ...base, subject: 'Goiás', answer: 'Goiânia' })).toBe('Goiás → Goiânia');
    expect(questionTitle({ ...base, prompt: 'Campinas', subject: 'Campinas', answer: 'São Paulo' })).toBe(
      'Campinas → São Paulo',
    );
  });
});
