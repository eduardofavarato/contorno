import { describe, expect, it } from 'vitest';
import { questionsFor, quizFor } from './quiz';

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

describe('questionsFor', () => {
  const setup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } } as const;

  it('returns the questions in the order of the ids', () => {
    expect(questionsFor(setup, [32, 76])?.map((question) => question.answer)).toEqual(['Argentina', 'Brasil']);
  });

  it('refuses ids that are not in the quiz', () => {
    expect(questionsFor(setup, [76, 4])).toBeNull();
    expect(questionsFor(setup, [-1])).toBeNull();
  });
});
