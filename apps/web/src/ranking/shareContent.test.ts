import type { GameSetup, RankingEntry } from '@contorno/core';
import { describe, expect, it } from 'vitest';
import { rankingCaption, rankingMessage, SHARE_TOP } from './shareContent';

const setup: GameSetup = { mode: 'brasil', pool: { kind: 'brasil', topic: 'capitais' } };
const entry = (rank: number, name: string, points: number, durationMs: number): RankingEntry => ({
  rank,
  userId: rank,
  name,
  points,
  durationMs,
  finishedAt: '2026-01-15T12:00:00.000Z',
});

describe('rankingCaption', () => {
  it('names the board', () => {
    expect(rankingCaption(setup)).toBe('Ranking do Contorno · Especial Brasil · Capitais');
  });
});

describe('rankingMessage', () => {
  it('lists the players with medals for the podium, points and time', () => {
    const message = rankingMessage(setup, [
      entry(1, 'Ana', 20_000, 42_000),
      entry(2, 'Beto', 18_000, 65_000),
      entry(3, 'Caio', 16_000, 70_000),
      entry(4, 'Duda', 14_000, 80_000),
    ]);

    expect(message).toBe(
      [
        '🏆 *Ranking do Contorno* · Especial Brasil · Capitais',
        '',
        '🥇 Ana — 20.000 pts em 0:42',
        '🥈 Beto — 18.000 pts em 1:05',
        '🥉 Caio — 16.000 pts em 1:10',
        '4º Duda — 14.000 pts em 1:20',
        '',
        'Jogue em https://contorno.fvrt.com.br',
      ].join('\n'),
    );
  });

  it('stops at the top of the ranking', () => {
    const entries = Array.from({ length: SHARE_TOP + 5 }, (_, i) =>
      entry(i + 1, `Jogador ${String(i + 1)}`, 1000, 60_000),
    );

    const lines = rankingMessage(setup, entries)
      .split('\n')
      .filter((line) => line.includes('Jogador'));

    expect(lines).toHaveLength(SHARE_TOP);
  });
});
