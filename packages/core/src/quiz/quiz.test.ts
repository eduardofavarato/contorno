import { describe, expect, it } from 'vitest';
import { quizFor } from './quiz';

describe('quizFor', () => {
  it('turns a level setup into typing questions about countries', () => {
    const quiz = quizFor({ mode: 'perguntas', pool: { kind: 'level', level: 1 } });

    expect(quiz).toMatchObject({ challenge: 'type', map: 'world', soloCount: 10 });
    expect(quiz.questions).toHaveLength(50);
    expect(quiz.questions.find((question) => question.regionId === 76)).toEqual({
      id: 76,
      regionId: 76,
      prompt: null,
      subject: 'Brasil',
      answer: 'Brasil',
      challenge: 'type',
      accepts: ['brasil', 'brazil'],
    });
  });

  it('asks Localizar by name, to be clicked', () => {
    const quiz = quizFor({ mode: 'localizar', pool: { kind: 'level', level: 1 } });

    expect(quiz.challenge).toBe('click');
    expect(quiz.questions.find((question) => question.regionId === 76)).toMatchObject({
      prompt: 'Brasil',
      accepts: [],
    });
  });

  it('plays a whole continent in solo games', () => {
    const quiz = quizFor({ mode: 'continentes', pool: { kind: 'continent', continent: 'oceania' } });

    expect(quiz.soloCount).toBeNull();
    expect(quiz.questions).toHaveLength(4);
  });
});
