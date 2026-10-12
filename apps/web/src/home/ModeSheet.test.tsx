import type { RankingEntry, RankingResponse } from '@contorno/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameApi } from '../api/gameApi';
import type { AuthContextValue } from '../auth/authContext';
import { WithAuth } from '../test-auth';
import { fakeAuth } from '../test-utils';
import { ModeSheet } from './ModeSheet';

vi.mock('../api/gameApi');

const mine = (rank: number, points: number, durationMs: number): RankingEntry => ({
  rank,
  userId: 7,
  name: 'Ana',
  points,
  durationMs,
  finishedAt: '2026-01-15T12:00:00.000Z',
});

const answer = (response: RankingResponse) => vi.mocked(gameApi.ranking).mockResolvedValue(response);

function renderSheet(auth: Partial<AuthContextValue>, mode: 'perguntas' | 'continentes' = 'perguntas') {
  const onLogin = vi.fn();
  render(
    <WithAuth value={fakeAuth(auth)}>
      <ModeSheet mode={mode} onPlay={vi.fn()} onLogin={onLogin} onClose={vi.fn()} />
    </WithAuth>,
  );
  return { onLogin };
}

/** The whole line, not just its bold label. */
const bestGame = async () => (await screen.findByText(/Seu melhor:/)).closest('p');

const signedIn: Partial<AuthContextValue> = { status: 'signedIn', user: { id: 7, name: 'Ana' } };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ModeSheet: best game', () => {
  it('shows the position, points and time of the player’s best game on the selected ranking', async () => {
    answer({ entries: [], mine: mine(3, 18_000, 130_000) });
    renderSheet(signedIn);

    expect(await bestGame()).toHaveTextContent('Seu melhor: #3 · 18.000 pts · 2:10');
    // One entry is enough to learn it: the answer carries the player's own game apart from the list.
    expect(gameApi.ranking).toHaveBeenCalledExactlyOnceWith('perguntas:level:1', 'test-token', 1);
  });

  it('says so when the player has never played the selected setup', async () => {
    answer({ entries: [], mine: null });
    renderSheet(signedIn);

    expect(await screen.findByText('Você nunca jogou Modo Perguntas · Fácil')).toBeInTheDocument();
  });

  it('follows the selected difficulty', async () => {
    vi.mocked(gameApi.ranking).mockImplementation((board) =>
      Promise.resolve({ entries: [], mine: board === 'perguntas:level:2' ? mine(1, 20_000, 60_000) : null }),
    );
    renderSheet(signedIn);
    await screen.findByText('Você nunca jogou Modo Perguntas · Fácil');

    await userEvent.click(screen.getByRole('radio', { name: 'Médio' }));

    expect(await bestGame()).toHaveTextContent('Seu melhor: #1 · 20.000 pts · 1:00');
    expect(gameApi.ranking).toHaveBeenLastCalledWith('perguntas:level:2', 'test-token', 1);
  });

  it('follows the selected continent', async () => {
    answer({ entries: [], mine: null });
    renderSheet(signedIn, 'continentes');
    await screen.findByText(/nunca jogou/);

    await userEvent.click(screen.getByRole('radio', { name: 'Europa' }));

    expect(await screen.findByText('Você nunca jogou Modo Continentes · Europa')).toBeInTheDocument();
    expect(gameApi.ranking).toHaveBeenLastCalledWith('continentes:continent:europe', 'test-token', 1);
  });

  it('is hidden for Disputa, which is not ranked, and back for Individual', async () => {
    answer({ entries: [], mine: mine(1, 20_000, 60_000) });
    renderSheet(signedIn);
    await screen.findByText(/Seu melhor:/);

    await userEvent.click(screen.getByRole('radio', { name: 'Disputa' }));
    expect(screen.queryByText(/Seu melhor:/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Individual' }));
    expect(await screen.findByText(/Seu melhor:/)).toBeInTheDocument();
  });

  it('shows a placeholder while it loads', () => {
    vi.mocked(gameApi.ranking).mockReturnValue(new Promise(() => undefined));
    renderSheet(signedIn);

    expect(screen.getByText('Carregando seu melhor…')).toBeInTheDocument();
  });

  it('shows nothing when the lookup fails, so the sheet still works', async () => {
    vi.mocked(gameApi.ranking).mockRejectedValue(new Error('offline'));
    renderSheet(signedIn);

    await vi.waitFor(() => {
      expect(screen.queryByText('Carregando seu melhor…')).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/Seu melhor|nunca jogou/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jogar' })).toBeInTheDocument();
  });

  it('invites a visitor to sign in, without asking the server anything', async () => {
    const { onLogin } = renderSheet({ status: 'anonymous' });

    await userEvent.click(screen.getByRole('button', { name: 'Entre para registrar seu melhor' }));

    expect(onLogin).toHaveBeenCalledOnce();
    expect(gameApi.ranking).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'loading'] as const)('is absent while accounts are %s', (status) => {
    renderSheet({ status });

    expect(screen.queryByText(/Seu melhor|nunca jogou|Entre para registrar/)).not.toBeInTheDocument();
    expect(gameApi.ranking).not.toHaveBeenCalled();
  });
});
