import type { GameSetup, RankingEntry } from '@contorno/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SHARE_TOP } from './shareContent';
import { RankingShareCard } from './RankingShareCard';

const setup: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const entry = (rank: number): RankingEntry => ({
  rank,
  userId: rank,
  name: `Jogador ${String(rank)}`,
  points: 20_000 - rank * 100,
  durationMs: 40_000 + rank * 1000,
  finishedAt: '2026-01-15T12:00:00.000Z',
});

describe('RankingShareCard', () => {
  it('shows the game, the date and each player with points and time', () => {
    render(<RankingShareCard setup={setup} entries={[entry(1), entry(2)]} date={new Date(2026, 0, 15)} />);

    expect(screen.getByText('🏆 Ranking do Contorno')).toBeInTheDocument();
    expect(screen.getByText('Modo Perguntas · Fácil · 15/01/2026')).toBeInTheDocument();
    expect(screen.getByText('Jogador 1')).toBeInTheDocument();
    expect(screen.getByText('19.900')).toBeInTheDocument();
    expect(screen.getByText('0:41')).toBeInTheDocument();
    expect(screen.getByText('contorno.fvrt.com.br')).toBeInTheDocument();
  });

  it('only prints the top of a long ranking', () => {
    const entries = Array.from({ length: SHARE_TOP + 5 }, (_, i) => entry(i + 1));

    render(<RankingShareCard setup={setup} entries={entries} date={new Date()} />);

    expect(screen.getAllByText(/^Jogador \d+$/)).toHaveLength(SHARE_TOP);
  });
});
