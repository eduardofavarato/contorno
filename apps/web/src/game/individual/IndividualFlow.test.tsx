import type { GameSetup, Question } from '@contorno/core';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameApi } from '../../api/gameApi';
import { ApiRequestError, NetworkError } from '../../api/http';
import type { AuthContextValue } from '../../auth/authContext';
import { WithAuth } from '../../test-auth';
import { fakeAuth } from '../../test-utils';
import { pickQuestions, stubResizeObserver } from '../../test-utils';
import { IndividualFlow } from './IndividualFlow';

vi.mock('../../api/gameApi');

const setup: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
// Ten countries of the easy level, the way the server would have drawn them.
const REGION_IDS = [76, 32, 152, 170, 604, 858, 840, 124, 484, 192];
const questions: Question[] = pickQuestions(setup, REGION_IDS);
const GAME = { gameId: 'game-1', questionIds: questions.map((question) => question.id) };

function renderFlow(auth: Partial<AuthContextValue> = {}) {
  const onLogin = vi.fn();
  const onOpenRanking = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <WithAuth value={fakeAuth(auth)}>
      <IndividualFlow
        setup={setup}
        onQuit={vi.fn()}
        onPlayAgain={vi.fn()}
        onLogin={onLogin}
        onOpenRanking={onOpenRanking}
      />
    </WithAuth>,
  );
  return { user, onLogin, onOpenRanking };
}

/** Answers every question right, waiting out the pause after each one. */
async function playAll(user: ReturnType<typeof userEvent.setup>, asked: readonly Question[] = questions) {
  for (const question of asked) {
    await user.type(screen.getByRole('textbox', { name: 'Nome do país' }), `${question.accepts[0] ?? ''}{Enter}`);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  stubResizeObserver(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('without accounts', () => {
  it('plays a plain game and says nothing about the ranking', async () => {
    const { user } = renderFlow({ status: 'unavailable' });
    expect(screen.getByRole('textbox', { name: 'Nome do país' })).toBeInTheDocument();
    expect(gameApi.start).not.toHaveBeenCalled();

    // Give up all ten questions to reach the results.
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('button', { name: 'Desistir' }));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }

    expect(screen.getByText('Resultado por País')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ranking' })).not.toBeInTheDocument();
  });
});

describe('loading', () => {
  it('waits for the server to say whether accounts exist', () => {
    renderFlow({ status: 'loading' });

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });
});

describe('signed out', () => {
  it('plays a practice game and invites the player to sign in at the end', async () => {
    const { user, onLogin } = renderFlow({ status: 'anonymous' });
    expect(gameApi.start).not.toHaveBeenCalled();
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('button', { name: 'Desistir' }));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }

    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(onLogin).toHaveBeenCalledOnce();
  });
});

describe('signed in', () => {
  it('plays the questions the server drew, sends the moves and shows the position', async () => {
    vi.mocked(gameApi.start).mockResolvedValue(GAME);
    vi.mocked(gameApi.finish).mockResolvedValue({ points: 20_000, durationMs: 42_000, rank: 3 });
    const { user, onOpenRanking } = renderFlow({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    expect(screen.getByText('Preparando a partida…')).toBeInTheDocument();
    await screen.findByRole('textbox', { name: 'Nome do país' });
    expect(gameApi.start).toHaveBeenCalledExactlyOnceWith(setup, 'test-token');

    await playAll(user);

    expect(await screen.findByText(/Você ficou em/)).toHaveTextContent('#3');
    expect(screen.getByText('Tempo: 0:42')).toBeInTheDocument();
    const [gameId, events, token] = vi.mocked(gameApi.finish).mock.calls[0] ?? [];
    expect(gameId).toBe('game-1');
    expect(token).toBe('test-token');
    expect(events).toHaveLength(20);
    expect(events?.[0]).toEqual({ type: 'guess', guess: { type: 'text', value: questions[0]?.accepts[0] } });

    await user.click(screen.getByRole('button', { name: 'Ver ranking' }));
    expect(onOpenRanking).toHaveBeenCalledWith(setup);
  });

  it('sends the moves once only', async () => {
    vi.mocked(gameApi.start).mockResolvedValue(GAME);
    vi.mocked(gameApi.finish).mockResolvedValue({ points: 20_000, durationMs: 42_000, rank: 1 });
    const { user } = renderFlow({ status: 'signedIn', user: { id: 1, name: 'Ana' } });
    await screen.findByRole('textbox', { name: 'Nome do país' });

    await playAll(user);
    await screen.findByText(/Você ficou em/);

    expect(gameApi.finish).toHaveBeenCalledTimes(1);
  });

  it('falls back to a practice game when the server cannot open one', async () => {
    vi.mocked(gameApi.start).mockRejectedValue(new NetworkError());
    const { user } = renderFlow({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    await screen.findByRole('textbox', { name: 'Nome do país' });
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('button', { name: 'Desistir' }));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }

    expect(screen.getByRole('region', { name: 'Ranking' })).toHaveTextContent('não entrou no ranking');
    expect(gameApi.finish).not.toHaveBeenCalled();
  });

  it('lets the player try again when the connection dropped while sending', async () => {
    vi.mocked(gameApi.start).mockResolvedValue(GAME);
    vi.mocked(gameApi.finish)
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce({ points: 20_000, durationMs: 42_000, rank: 2 });
    const { user } = renderFlow({ status: 'signedIn', user: { id: 1, name: 'Ana' } });
    await screen.findByRole('textbox', { name: 'Nome do país' });
    await playAll(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText(/Você ficou em/)).toHaveTextContent('#2');
  });

  it('does not offer to retry a game the server refused', async () => {
    vi.mocked(gameApi.start).mockResolvedValue(GAME);
    vi.mocked(gameApi.finish).mockRejectedValue(new ApiRequestError('GAME_REJECTED', 422, 'x'));
    const { user } = renderFlow({ status: 'signedIn', user: { id: 1, name: 'Ana' } });
    await screen.findByRole('textbox', { name: 'Nome do país' });
    await playAll(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('não pôde ser validada');
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
  });

  it('shows a running clock during the game', async () => {
    vi.mocked(gameApi.start).mockResolvedValue(GAME);
    renderFlow({ status: 'signedIn', user: { id: 1, name: 'Ana' } });
    await screen.findByRole('textbox', { name: 'Nome do país' });

    expect(screen.getByRole('group', { name: 'Tempo' })).toHaveTextContent('0:00');
    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(screen.getByRole('group', { name: 'Tempo' })).toHaveTextContent('1:05');
  });
});
