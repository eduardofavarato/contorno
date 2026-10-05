import { getCountry, selectIndividualQuestions, type CountryId, type GameSetup } from '@contorno/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryRequired, stubResizeObserver } from '../../test-utils';
import { IndividualGame } from './IndividualGame';

const perguntas: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const oceania: GameSetup = { mode: 'continentes', pool: { kind: 'continent', continent: 'oceania' } };
const localizar: GameSetup = { mode: 'localizar', pool: { kind: 'level', level: 1 } };

/** `random` that always answers 0: the shuffle is then fixed and the test can predict the questions. */
const random = () => 0;
const questionsOf = (setup: GameSetup): CountryId[] => selectIndividualQuestions(setup.pool, random);
const answerOf = (id: CountryId) => getCountry(id).aliases[0] ?? '';
const firstQuestion = (game: GameSetup): CountryId => {
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
    expect(answerBox()).toHaveValue(getCountry(first).name);
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

    for (const id of questionsOf(oceania)) {
      await user.type(answerBox(), `${answerOf(id)}{Enter}`);
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
    const target = getCountry(firstQuestion(localizar));

    expect(screen.getByText(target.name)).toBeInTheDocument();
    const map = await screen.findByRole('img', { name: 'Mapa-múndi' });

    fireEvent.click(queryRequired(map, `[data-country-id="${String(target.id)}"]`));

    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +2.000 pontos');
  });

  it('counts a click on another country as a mistake', async () => {
    stubResizeObserver();
    renderGame(localizar);
    const other = firstQuestion(localizar) === 76 ? 32 : 76;
    const map = await screen.findByRole('img', { name: 'Mapa-múndi' });

    fireEvent.click(queryRequired(map, `[data-country-id="${String(other)}"]`));

    expect(screen.getByRole('status')).toHaveTextContent('✗ Não é esse! 2 tentativas restantes.');
  });
});
