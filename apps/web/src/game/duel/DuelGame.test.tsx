import { quizFor, selectDuelSetup, type GameSetup, type Question } from '@contorno/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryRequired, required, stubResizeObserver } from '../../test-utils';
import { DuelGame } from './DuelGame';

const perguntas: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const localizar: GameSetup = { mode: 'localizar', pool: { kind: 'level', level: 1 } };
const cidades: GameSetup = { mode: 'brasil', pool: { kind: 'brasil', topic: 'cidades' } };
const capitais: GameSetup = { mode: 'brasil', pool: { kind: 'brasil', topic: 'capitais' } };

/** `random` that always answers 0: the shuffle is then fixed and the test can predict the questions. */
const random = () => 0;
const plan = (game: GameSetup) => selectDuelSetup(quizFor(game), random);
const answerOf = (question: Question) => question.accepts[0] ?? '';

function renderGame(game: GameSetup) {
  const onQuit = vi.fn();
  const onPlayAgain = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<DuelGame setup={game} random={random} onQuit={onQuit} onPlayAgain={onPlayAgain} />);
  return { user, onQuit, onPlayAgain };
}

const answerBox = () => screen.getByRole('textbox', { name: 'Nome do país' });
const turn = () => within(screen.getByRole('group', { name: 'Turno' }));
const score = (player: string) => within(screen.getByRole('group', { name: player }));
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  stubResizeObserver(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('haptics', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('buzzes briefly for a right answer and twice for a wrong one', async () => {
    const vibrate = vi.fn(() => true);
    Object.assign(navigator, { vibrate });
    const { user } = renderGame(perguntas);
    const [first] = plan(perguntas).questions;

    await user.type(answerBox(), 'zzz{Enter}');
    expect(vibrate).toHaveBeenLastCalledWith([30, 40, 30]);

    wait(2000);
    await user.type(answerBox(), `${answerOf(required(first))}{Enter}`);
    expect(vibrate).toHaveBeenLastCalledWith(20);
  });
});

describe('typing duel', () => {
  it('starts with Jogador A, then hands the turn over after a correct answer', async () => {
    const { user } = renderGame(perguntas);
    const [first] = plan(perguntas).questions;

    expect(turn().getByText('Pergunta 1/10')).toBeInTheDocument();
    await user.type(answerBox(), `${answerOf(required(first))}{Enter}`);

    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +2.000 pts');
    expect(score('Jogador A').getByText('2.000')).toBeInTheDocument();

    wait(1600);
    expect(turn().getByText('Pergunta 2/10')).toBeInTheDocument();
    expect(turn().getByText('Jogador B')).toBeInTheDocument();
  });

  it('lets the rival steal after a wrong answer, for 1.000 points', async () => {
    const { user } = renderGame(perguntas);
    const [first] = plan(perguntas).questions;

    await user.type(answerBox(), 'zzz{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('✗ Incorreto! Jogador B pode roubar por 1.000 pts.');
    // The answer is not revealed: the rival still has to name it.
    expect(answerBox()).toHaveValue('');

    wait(2000);
    expect(turn().getByText('Roubo!')).toBeInTheDocument();
    expect(screen.getByText('Disponível: 1.000')).toBeInTheDocument();

    await user.type(answerBox(), `${answerOf(required(first))}{Enter}`);
    expect(screen.getByRole('status')).toHaveTextContent('✓ Roubo de Jogador B! +1.000 pts');
    expect(score('Jogador B').getByText('1.000')).toBeInTheDocument();
    expect(score('Jogador A').getByText('0')).toBeInTheDocument();
  });

  it('gives nobody points when the steal fails, and reveals the country', async () => {
    const { user } = renderGame(perguntas);
    const [first] = plan(perguntas).questions;

    await user.click(screen.getByRole('button', { name: 'Desistir' }));
    expect(screen.getByRole('status')).toHaveTextContent('Jogador B pode roubar por 1.000 pts!');
    wait(2000);

    expect(screen.getByRole('button', { name: 'Desistir' })).toBeDisabled();
    await user.type(answerBox(), 'zzz{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent(`Era ${required(first).answer}`);
    expect(answerBox()).toHaveValue(required(first).answer);
  });

  it('plays the Rodada de Fogo when tied and ends with the winner', async () => {
    const { user, onQuit, onPlayAgain } = renderGame(perguntas);
    const { questions, tiebreakOrder } = plan(perguntas);

    // Everyone answers their own turn right: 5 x 2.000 each, a tie.
    for (const question of questions) {
      await user.type(answerBox(), `${answerOf(question)}{Enter}`);
      wait(1600);
    }

    expect(turn().getByText('Rodada de Fogo')).toBeInTheDocument();
    expect(screen.getByText('Quem acertar sozinho vence')).toBeInTheDocument();

    // A gets it right, B wrong: A wins.
    await user.type(answerBox(), `${answerOf(required(tiebreakOrder[0]))}{Enter}`);
    expect(screen.getByRole('status')).toHaveTextContent('Vez de Jogador B');
    wait(1500);
    await user.type(answerBox(), 'zzz{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('🏆 Jogador A vence a Rodada de Fogo!');
    wait(2000);

    expect(screen.getByText('🏆 Jogador A vence!')).toBeInTheDocument();
    expect(score('Jogador A').getByText('10.000')).toBeInTheDocument();
    expect(score('Jogador B').getByText('10.000')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Revanche' }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Início' }));
    expect(onQuit).toHaveBeenCalledOnce();
  });

  it('confirms before quitting', async () => {
    const { user, onQuit } = renderGame(perguntas);

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('alertdialog', { name: 'Sair da disputa?' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sair' }));

    expect(onQuit).toHaveBeenCalledOnce();
  });
});

describe('locating duel', () => {
  const pathOf = (map: HTMLElement, id: number) => queryRequired(map, `[data-region-id="${String(id)}"]`);

  it('does not reveal the country after a miss, only once the steal is settled', async () => {
    stubResizeObserver();
    renderGame(localizar);
    const first = required(plan(localizar).questions[0]);
    const wrongId = first.regionId === 76 ? 32 : 76;
    const map = await screen.findByRole('img', { name: 'Mapa-múndi' });

    expect(screen.getByText(first.answer)).toBeInTheDocument();
    fireEvent.click(pathOf(map, wrongId));
    expect(screen.getByRole('status')).toHaveTextContent('Jogador B pode roubar');
    expect(pathOf(map, first.regionId).getAttribute('class')).toMatch(/neutral/);

    wait(2000);
    fireEvent.click(pathOf(map, first.regionId));
    expect(screen.getByRole('status')).toHaveTextContent('✓ Roubo de Jogador B!');
    expect(pathOf(map, first.regionId).getAttribute('class')).toMatch(/correct/);
  });
});

describe('Especial Brasil duels', () => {
  it('asks the capital of a state and reveals it only after the steal', async () => {
    const { user } = renderGame(capitais);
    const first = required(plan(capitais).questions[0]);
    const box = () => screen.getByRole('textbox', { name: 'Capital do estado' });

    await user.type(box(), 'zzz{Enter}');
    expect(box()).toHaveValue('');
    wait(2000);
    await user.type(box(), `${answerOf(first)}{Enter}`);

    expect(screen.getByRole('status')).toHaveTextContent('✓ Roubo de Jogador B!');
    expect(box()).toHaveValue(first.answer);
  });

  it('shows a city to find, and only reveals its state once the steal is settled', async () => {
    stubResizeObserver();
    renderGame(cidades);
    const first = required(plan(cidades).questions[0]);
    const wrongId = first.regionId === 35 ? 52 : 35;
    const map = await screen.findByRole('img', { name: 'Mapa do Brasil' });
    const path = (id: number) => queryRequired(map, `[data-region-id="${String(id)}"]`);

    expect(screen.getByText(first.prompt ?? '')).toBeInTheDocument();
    fireEvent.click(path(wrongId));
    expect(screen.getByRole('status')).toHaveTextContent('Jogador B pode roubar');
    expect(path(first.regionId).getAttribute('class')).toMatch(/neutral/);

    wait(2000);
    fireEvent.click(path(first.regionId));
    expect(path(first.regionId).getAttribute('class')).toMatch(/correct/);
  });
});
