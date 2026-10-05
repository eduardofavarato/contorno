import { quizFor, selectIndividualQuestions, type GameSetup, type Question } from '@contorno/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryRequired, required, seededRandom, stubResizeObserver } from '../../test-utils';
import { IndividualGame } from './IndividualGame';

const perguntas: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const oceania: GameSetup = { mode: 'continentes', pool: { kind: 'continent', continent: 'oceania' } };
const localizar: GameSetup = { mode: 'localizar', pool: { kind: 'level', level: 1 } };
const capitais: GameSetup = { mode: 'brasil', pool: { kind: 'brasil', topic: 'capitais' } };
const estados: GameSetup = { mode: 'brasil', pool: { kind: 'brasil', topic: 'estados' } };
const cidades: GameSetup = { mode: 'brasil', pool: { kind: 'brasil', topic: 'cidades' } };

/** `random` that always answers 0: the shuffle is then fixed and the test can predict the questions. */
const random = () => 0;
const questionsOf = (setup: GameSetup): Question[] => selectIndividualQuestions(quizFor(setup), random);
const answerOf = (question: Question) => question.accepts[0] ?? '';
const firstQuestion = (game: GameSetup): Question => {
  const [first] = questionsOf(game);
  if (first === undefined) throw new Error('No questions');
  return first;
};

function renderGame(game: GameSetup) {
  const onQuit = vi.fn();
  const onPlayAgain = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<IndividualGame setup={game} random={random} onQuit={onQuit} onPlayAgain={onPlayAgain} />);
  return { user, onQuit, onPlayAgain };
}

const stat = (name: string) => within(screen.getByRole('group', { name }));
const answerBox = () => screen.getByRole('textbox', { name: 'Nome do país' });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  stubResizeObserver(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('typing game', () => {
  it('scores a correct answer, then moves on to the next question', async () => {
    const { user } = renderGame(perguntas);
    const first = firstQuestion(perguntas);

    await user.type(answerBox(), `${answerOf(first)}{Enter}`);

    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +2.000 pontos');
    expect(answerBox()).toHaveValue(first.answer);
    expect(answerBox()).toBeDisabled();
    expect(stat('Pergunta').getByText('1/10')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(stat('Pergunta').getByText('2/10')).toBeInTheDocument();
    expect(stat('Pontuação').getByText('2.000')).toBeInTheDocument();
    expect(answerBox()).toHaveValue('');
    expect(answerBox()).toBeEnabled();
  });

  it('takes points off for wrong answers and gives up after three', async () => {
    const { user } = renderGame(perguntas);

    await user.type(answerBox(), 'zzz{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('✗ Incorreto. 2 tentativas restantes.');
    expect(screen.getByText('1 erro · 2 restantes')).toBeInTheDocument();
    expect(screen.getByText('1.800')).toBeInTheDocument();

    await user.type(answerBox(), 'zzz{Enter}');
    await user.type(answerBox(), 'zzz{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Tentativas esgotadas');
    expect(answerBox()).toBeDisabled();
  });

  it('lets the player give up', async () => {
    const { user } = renderGame(perguntas);

    await user.click(screen.getByRole('button', { name: 'Desistir' }));

    expect(screen.getByRole('status')).toHaveTextContent('+0 pontos');
    expect(screen.getByRole('button', { name: 'Desistir' })).toBeDisabled();
  });

  it('ignores empty answers', async () => {
    const { user } = renderGame(perguntas);

    await user.type(answerBox(), '   {Enter}');

    expect(screen.queryByText(/Incorreto/)).not.toBeInTheDocument();
    expect(screen.getByText('2.000')).toBeInTheDocument();
  });

  it('shows the final results after the last question and can start over', async () => {
    const { user, onQuit, onPlayAgain } = renderGame(oceania);

    for (const question of questionsOf(oceania)) {
      await user.type(answerBox(), `${answerOf(question)}{Enter}`);
      act(() => {
        vi.advanceTimersByTime(1600);
      });
    }

    expect(screen.getByText('8.000')).toBeInTheDocument();
    expect(screen.getByText('de 8.000 pontos possíveis')).toBeInTheDocument();
    expect(screen.getByText('Perfeito! Gênio Geográfico')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Jogar Novamente' }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Início' }));
    expect(onQuit).toHaveBeenCalledOnce();
  });
});

describe('quitting', () => {
  it('asks for confirmation and lets the player keep playing', async () => {
    const { user, onQuit } = renderGame(perguntas);

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('alertdialog', { name: 'Sair da partida?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onQuit).not.toHaveBeenCalled();
  });

  it('quits once confirmed', async () => {
    const { user, onQuit } = renderGame(perguntas);

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sair' }));

    expect(onQuit).toHaveBeenCalledOnce();
  });

  it('cancels with Escape', async () => {
    const { user } = renderGame(perguntas);

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('locating game', () => {
  it('shows the country to find and scores a click on it', async () => {
    stubResizeObserver();
    renderGame(localizar);
    const target = firstQuestion(localizar);

    expect(screen.getByText(target.answer)).toBeInTheDocument();
    const map = await screen.findByRole('img', { name: 'Mapa-múndi' });

    fireEvent.click(queryRequired(map, `[data-region-id="${String(target.regionId)}"]`));

    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +2.000 pontos');
  });

  it('counts a click on another country as a mistake', async () => {
    stubResizeObserver();
    renderGame(localizar);
    const other = firstQuestion(localizar).regionId === 76 ? 32 : 76;
    const map = await screen.findByRole('img', { name: 'Mapa-múndi' });

    fireEvent.click(queryRequired(map, `[data-region-id="${String(other)}"]`));

    expect(screen.getByRole('status')).toHaveTextContent('✗ Não é esse! 2 tentativas restantes.');
  });
});

describe('Especial Brasil', () => {
  it('asks for the name or abbreviation of a state', async () => {
    const { user } = renderGame(estados);
    const first = firstQuestion(estados);

    expect(screen.getByRole('textbox', { name: 'Nome do estado' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Nome do estado' }), 'zzz{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('✗ Incorreto.');

    const abbreviation = first.accepts[1] ?? '';
    await user.type(screen.getByRole('textbox', { name: 'Nome do estado' }), `${abbreviation}{Enter}`);
    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +1.800 pontos (1 erro)');
  });

  it('asks for the capital of the highlighted state', async () => {
    const { user } = renderGame(capitais);
    const first = firstQuestion(capitais);

    const box = screen.getByRole('textbox', { name: 'Capital do estado' });
    expect(box).toHaveAttribute('placeholder', 'Capital do estado…');
    await user.type(box, `${answerOf(first)}{Enter}`);

    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +2.000 pontos');
    expect(box).toHaveValue(first.answer);
  });

  it('shows a city and expects a click on its state, on the map of Brazil', async () => {
    stubResizeObserver();
    renderGame(cidades);
    const city = firstQuestion(cidades);
    const map = await screen.findByRole('img', { name: 'Mapa do Brasil' });

    expect(screen.getByText('Em qual estado fica:')).toBeInTheDocument();
    expect(screen.getByText(city.prompt ?? '')).toBeInTheDocument();
    const wrong = city.regionId === 35 ? 52 : 35;
    fireEvent.click(queryRequired(map, `[data-region-id="${String(wrong)}"]`));
    expect(screen.getByRole('status')).toHaveTextContent('✗ Não é esse!');

    fireEvent.click(queryRequired(map, `[data-region-id="${String(city.regionId)}"]`));
    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +1.800 pontos (1 erro)');
  });

  it('lets a state answer several cities even though an earlier one already painted it', async () => {
    stubResizeObserver();
    // Pick a shuffle whose first two questions are cities of the same state.
    const seed = [...Array(2000).keys()].find((candidate) => {
      const [a, b] = selectIndividualQuestions(quizFor(cidades), seededRandom(candidate));
      return a?.regionId === b?.regionId && a !== undefined;
    });
    if (seed === undefined) throw new Error('No seed puts two cities of one state first');
    const [first] = selectIndividualQuestions(quizFor(cidades), seededRandom(seed));
    render(<IndividualGame setup={cidades} random={seededRandom(seed)} onQuit={vi.fn()} onPlayAgain={vi.fn()} />);
    const map = await screen.findByRole('img', { name: 'Mapa do Brasil' });
    const state = queryRequired(map, `[data-region-id="${String(required(first).regionId)}"]`);

    fireEvent.click(state);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(state.getAttribute('class')).toMatch(/correct/);

    // The second city belongs to that same, already green, state: clicking it must still answer.
    fireEvent.click(state);
    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +2.000 pontos');
  });
});
