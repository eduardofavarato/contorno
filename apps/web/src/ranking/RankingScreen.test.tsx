import type { RankingEntry, RankingResponse } from '@contorno/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameApi } from '../api/gameApi';
import { WithAuth } from '../test-auth';
import { fakeAuth } from '../test-utils';
import type { AuthContextValue } from '../auth/authContext';
import { RankingScreen } from './RankingScreen';

vi.mock('../api/gameApi');

const entry = (rank: number, name: string, points: number, durationMs: number, userId = rank): RankingEntry => ({
  rank,
  userId,
  name,
  points,
  durationMs,
  finishedAt: '2026-01-15T12:00:00.000Z',
});

function renderRanking(
  auth: Partial<AuthContextValue> = { status: 'anonymous' },
  initial?: Parameters<typeof RankingScreen>[0]['initial'],
) {
  const onBack = vi.fn();
  const onLogin = vi.fn();
  render(
    <WithAuth value={fakeAuth(auth)}>
      <RankingScreen {...(initial && { initial })} onBack={onBack} onLogin={onLogin} />
    </WithAuth>,
  );
  return { onBack, onLogin };
}

const answer = (response: RankingResponse) => vi.mocked(gameApi.ranking).mockResolvedValue(response);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('RankingScreen', () => {
  it('lists the players with points and time, best first', async () => {
    answer({ entries: [entry(1, 'Beto', 20_000, 42_000), entry(2, 'Ana', 18_000, 65_000)], mine: null });
    renderRanking();

    const table = await screen.findByRole('table', { name: 'Ranking de Modo Perguntas · Fácil' });
    const rows = within(table).getAllByRole('row').slice(1);

    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .slice(0, 4)
          .map((cell) => cell.textContent),
      ),
    ).toEqual([
      ['1', 'Beto', '20.000', '0:42'],
      ['2', 'Ana', '18.000', '1:05'],
    ]);
    expect(gameApi.ranking).toHaveBeenCalledWith('perguntas:level:1', null);
  });

  it('asks for the board that was picked, and opens on the one given', async () => {
    answer({ entries: [], mine: null });
    renderRanking({ status: 'anonymous' }, { mode: 'brasil', pool: { kind: 'brasil', topic: 'capitais' } });

    await screen.findByText(/Ninguém jogou/);
    expect(gameApi.ranking).toHaveBeenLastCalledWith('brasil:brasil:capitais', null);

    await userEvent.click(screen.getByRole('radio', { name: 'Cidades' }));
    await screen.findByText(/Ninguém jogou Especial Brasil · Cidades/);
    expect(gameApi.ranking).toHaveBeenLastCalledWith('brasil:brasil:cidades', null);
  });

  it('switches between modes and their pools', async () => {
    answer({ entries: [], mine: null });
    renderRanking();
    await screen.findByText(/Ninguém jogou/);

    await userEvent.click(screen.getByRole('radio', { name: 'Continentes' }));
    await userEvent.click(await screen.findByRole('radio', { name: 'Europa' }));

    expect(gameApi.ranking).toHaveBeenLastCalledWith('continentes:continent:europe', null);
  });

  it('highlights the signed-in player and sends their token to see their own best game', async () => {
    answer({
      entries: [entry(1, 'Beto', 20_000, 42_000), entry(2, 'Ana', 18_000, 65_000, 7)],
      mine: entry(2, 'Ana', 18_000, 65_000, 7),
    });
    renderRanking({ status: 'signedIn', user: { id: 7, name: 'Ana' } });

    const row = (await screen.findByRole('cell', { name: 'Ana' })).closest('tr');
    expect(row?.className).toMatch(/mine/);
    expect(gameApi.ranking).toHaveBeenCalledWith('perguntas:level:1', 'test-token');
  });

  it('shows where the player stands when they are outside the listed top', async () => {
    answer({ entries: [entry(1, 'Beto', 20_000, 42_000)], mine: entry(37, 'Ana', 9_000, 90_000, 7) });
    renderRanking({ status: 'signedIn', user: { id: 7, name: 'Ana' } });

    expect(await screen.findByText(/Sua melhor/)).toHaveTextContent('Sua melhor: #37 · 9.000 pts · 1:30');
  });

  it('invites visitors to sign in', async () => {
    answer({ entries: [entry(1, 'Beto', 20_000, 42_000)], mine: null });
    const { onLogin } = renderRanking({ status: 'anonymous' });

    await userEvent.click(await screen.findByRole('button', { name: 'Entrar para aparecer no ranking' }));
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('cheers on the first player of an empty board', async () => {
    answer({ entries: [], mine: null });
    renderRanking();

    expect(await screen.findByText(/Seja o primeiro/)).toBeInTheDocument();
  });

  it('tells the player when the ranking cannot be loaded', async () => {
    vi.mocked(gameApi.ranking).mockRejectedValue(new Error('offline'));
    renderRanking();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o ranking.');
  });

  it('goes back', async () => {
    answer({ entries: [], mine: null });
    const { onBack } = renderRanking();

    await userEvent.click(screen.getByRole('button', { name: '← Voltar' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
