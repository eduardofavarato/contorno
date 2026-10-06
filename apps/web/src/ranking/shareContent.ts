import type { GameSetup, RankingEntry } from '@contorno/core';
import { describeSetup } from '../copy';
import { formatDuration, formatPoints } from '../utils/format';

/** How many players the shared image and message list. */
export const SHARE_TOP = 10;

const SITE = 'https://contorno.fvrt.com.br';
const MEDALS = ['🥇', '🥈', '🥉'] as const;

/** Short text that accompanies the shared image (which already shows the detail). */
export function rankingCaption(setup: GameSetup): string {
  return `Ranking do Contorno · ${describeSetup(setup)}`;
}

function place(rank: number): string {
  return MEDALS[rank - 1] ?? `${String(rank)}º`;
}

/** The whole ranking as plain text, for chats. */
export function rankingMessage(setup: GameSetup, entries: readonly RankingEntry[]): string {
  const lines = entries
    .slice(0, SHARE_TOP)
    .map(
      (entry) =>
        `${place(entry.rank)} ${entry.name} — ${formatPoints(entry.points)} pts em ${formatDuration(entry.durationMs)}`,
    );

  return [`🏆 *Ranking do Contorno* · ${describeSetup(setup)}`, '', ...lines, '', `Jogue em ${SITE}`].join('\n');
}
