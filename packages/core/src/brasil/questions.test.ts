import { describe, expect, it } from 'vitest';
import { quizFor } from '../quiz/quiz';
import { isCorrectGuess } from '../quiz/question';
import { BRASIL_CITIES, BRASIL_STATES } from './data';
import { brasilQuestions } from './questions';

const find = (questions: ReturnType<typeof brasilQuestions>, id: number) => {
  const question = questions.find((entry) => entry.id === id);
  if (!question) throw new Error(`No question ${String(id)}`);
  return question;
};
const SAO_PAULO = 35;
const GOIAS = 52;
const CAMPINAS = 3509502;

describe('data', () => {
  it('has the 26 states and the Distrito Federal, with unique codes and abbreviations', () => {
    expect(BRASIL_STATES).toHaveLength(27);
    expect(new Set(BRASIL_STATES.map((state) => state.code)).size).toBe(27);
    expect(new Set(BRASIL_STATES.map((state) => state.abbr)).size).toBe(27);
  });

  it('has three cities for every state but the Distrito Federal, none of them the capital', () => {
    const distritoFederal = BRASIL_STATES.find((state) => state.abbr === 'DF');
    for (const state of BRASIL_STATES) {
      const cities = BRASIL_CITIES.filter((city) => city.stateCode === state.code);
      expect(cities, state.name).toHaveLength(state === distritoFederal ? 0 : 3);
      expect(cities.map((city) => city.name)).not.toContain(state.capital);
    }
  });

  it('keeps the cities ordered by population within each state', () => {
    for (const state of BRASIL_STATES) {
      const population = BRASIL_CITIES.filter((city) => city.stateCode === state.code).map((city) => city.population);
      expect(population).toEqual([...population].sort((a, b) => b - a));
    }
  });
});

describe('estados', () => {
  const questions = brasilQuestions('estados');

  it('asks for each state by typing, accepting its name or abbreviation', () => {
    expect(questions).toHaveLength(27);
    const saoPaulo = find(questions, SAO_PAULO);

    expect(saoPaulo).toMatchObject({ regionId: SAO_PAULO, prompt: null, answer: 'São Paulo', challenge: 'type' });
    for (const typed of ['São Paulo', 'sao paulo', 'SP']) {
      expect(isCorrectGuess(saoPaulo, { type: 'text', value: typed }), typed).toBe(true);
    }
    expect(isCorrectGuess(saoPaulo, { type: 'text', value: 'campinas' })).toBe(false);
  });
});

describe('capitais', () => {
  const questions = brasilQuestions('capitais');

  it('asks for the capital of the highlighted state', () => {
    const goias = find(questions, GOIAS);

    expect(goias).toMatchObject({ regionId: GOIAS, subject: 'Goiás', answer: 'Goiânia', challenge: 'type' });
    expect(isCorrectGuess(goias, { type: 'text', value: 'goiania' })).toBe(true);
    // The state's own name is not the capital.
    expect(isCorrectGuess(goias, { type: 'text', value: 'Goiás' })).toBe(false);
  });

  it('accepts the common spelling of São Luís', () => {
    const maranhao = questions.find((question) => question.answer === 'São Luís');

    expect(maranhao && isCorrectGuess(maranhao, { type: 'text', value: 'Sao Luiz' })).toBe(true);
  });
});

describe('cidades', () => {
  const questions = brasilQuestions('cidades');

  it('shows the city and expects a click on its state', () => {
    expect(questions).toHaveLength(78);
    const campinas = find(questions, CAMPINAS);

    expect(campinas).toMatchObject({
      prompt: 'Campinas',
      regionId: SAO_PAULO,
      answer: 'São Paulo',
      challenge: 'click',
    });
    expect(isCorrectGuess(campinas, { type: 'region', id: SAO_PAULO })).toBe(true);
    expect(isCorrectGuess(campinas, { type: 'region', id: GOIAS })).toBe(false);
    expect(isCorrectGuess(campinas, { type: 'text', value: 'São Paulo' })).toBe(false);
  });
});

describe('quizFor', () => {
  it('plays the Brazil map, sampling 10 questions', () => {
    for (const topic of ['estados', 'capitais', 'cidades'] as const) {
      expect(quizFor({ mode: 'brasil', pool: { kind: 'brasil', topic } })).toMatchObject({
        map: 'brasil',
        soloCount: 10,
        challenge: topic === 'cidades' ? 'click' : 'type',
      });
    }
  });
});
