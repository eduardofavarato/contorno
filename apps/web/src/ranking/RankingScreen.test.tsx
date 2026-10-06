import type { RankingEntry, RankingResponse } from '@contorno/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameApi } from '../api/gameApi';
import { WithAuth } from '../test-auth';
import { fakeAuth } from '../test-utils';
import type { AuthContextValue } from '../auth/authContext';
import { shareOrDownloadImage, supportsFileShare } from '../share/shareImage';
import { shareText } from '../share/shareText';
import { RankingScreen } from './RankingScreen';

vi.mock('../api/gameApi');
vi.mock('../share/shareImage', () => ({
  shareOrDownloadImage: vi.fn(() => Promise.resolve()),
  supportsFileShare: vi.fn(() => true),
}));
vi.mock('../share/shareText', () => ({ shareText: vi.fn() }));

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
  const onLogin = vi.fn();
  render(
    <WithAuth value={fakeAuth(auth)}>
      <RankingScreen {...(initial && { initial })} onLogin={onLogin} />
    </WithAuth>,
  );
  return { onLogin };
}

const answer = (response: RankingResponse) => vi.mocked(gameApi.ranking).mockResolvedValue(response);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('RankingScreen', () => {
  it('puts the top three on the podium and lists the rest, best first', async () => {
    answer({
      entries: [
        entry(1, 'Beto', 20_000, 42_000),
        entry(2, 'Ana', 18_000, 65_000),
        entry(3, 'Caio', 17_000, 70_000),
        entry(4, 'Duda', 16_000, 80_000),
        entry(5, 'Edu', 15_000, 90_000),
      ],
      mine: null,
    });
    renderRanking();

    const podium = await screen.findByRole('list', { name: 'Pódio de Modo Perguntas · Fácil' });
    expect(
      within(podium)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['1Beto20.0000:42', '2Ana18.0001:05', '3Caio17.0001:10']);

    const rest = screen.getByRole('list', { name: 'Ranking de Modo Perguntas · Fácil' });
    expect(
      within(rest)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([expect.stringMatching(/^4Duda.*1:2016\.000$/), expect.stringMatching(/^5Edu.*1:3015\.000$/)]);
    expect(gameApi.ranking).toHaveBeenCalledWith('perguntas:level:1', null);
  });

  it('shows only a podium when there are no more than three players', async () => {
    answer({ entries: [entry(1, 'Beto', 20_000, 42_000)], mine: null });
    renderRanking();

    expect(await screen.findByRole('list', { name: /Pódio/ })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /^Ranking de/ })).not.toBeInTheDocument();
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

  it('highlights the signed-in player in the list and sends their token to see their own best game', async () => {
    answer({
      entries: [
        entry(1, 'Beto', 20_000, 42_000),
        entry(2, 'Caio', 19_000, 50_000),
        entry(3, 'Duda', 18_500, 60_000),
        entry(4, 'Ana', 18_000, 65_000, 7),
      ],
      mine: entry(4, 'Ana', 18_000, 65_000, 7),
    });
    renderRanking({ status: 'signedIn', user: { id: 7, name: 'Ana' } });

    const rest = await screen.findByRole('list', { name: 'Ranking de Modo Perguntas · Fácil' });
    const row = within(rest).getByText('Ana').closest('li');
    expect(row?.className).toMatch(/rowMine/);
    expect(gameApi.ranking).toHaveBeenCalledWith('perguntas:level:1', 'test-token');
  });

  it('keeps the signed-in player’s best game in view below the list', async () => {
    answer({ entries: [entry(1, 'Beto', 20_000, 42_000)], mine: entry(37, 'Ana', 9_000, 90_000, 7) });
    renderRanking({ status: 'signedIn', user: { id: 7, name: 'Ana' } });

    const mine = await screen.findByRole('complementary', { name: 'Sua melhor partida' });
    expect(mine).toHaveTextContent('#37');
    expect(mine).toHaveTextContent('Sua melhor · 1:30');
    expect(mine).toHaveTextContent('9.000 pts');
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

  describe('sharing', () => {
    it('shares the ranking as an image named after the board', async () => {
      answer({ entries: [entry(1, 'Beto', 20_000, 42_000)], mine: null });
      renderRanking();

      await userEvent.click(await screen.findByRole('button', { name: /Compartilhar ranking/ }));

      expect(shareOrDownloadImage).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        'ranking-contorno.png',
        'Ranking do Contorno · Modo Perguntas · Fácil',
      );
    });

    it('shares the same ranking as text from the menu', async () => {
      answer({ entries: [entry(1, 'Beto', 20_000, 42_000)], mine: null });
      renderRanking();

      await userEvent.click(await screen.findByLabelText('Mais opções de compartilhamento'));
      await userEvent.click(screen.getByText(/Compartilhar como texto/));

      expect(shareText).toHaveBeenCalledWith(expect.stringContaining('🥇 Beto — 20.000 pts em 0:42'));
    });

    it('offers to download the image where files cannot be shared', async () => {
      vi.mocked(supportsFileShare).mockReturnValue(false);
      answer({ entries: [entry(1, 'Beto', 20_000, 42_000)], mine: null });
      renderRanking();

      expect(await screen.findByRole('button', { name: /Baixar imagem/ })).toBeInTheDocument();
    });

    it('has nothing to share on an empty board', async () => {
      answer({ entries: [], mine: null });
      renderRanking();
      await screen.findByText(/Seja o primeiro/);

      expect(screen.queryByRole('button', { name: /Compartilhar ranking|Baixar imagem/ })).not.toBeInTheDocument();
    });
  });
});
