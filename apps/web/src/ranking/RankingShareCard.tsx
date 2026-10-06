import type { GameSetup, RankingEntry } from '@contorno/core';
import { forwardRef } from 'react';
import { describeSetup } from '../copy';
import { cx } from '../ui/cx';
import { formatDuration, formatPoints } from '../utils/format';
import styles from './RankingShareCard.module.css';
import { SHARE_TOP } from './shareContent';

interface RankingShareCardProps {
  readonly setup: GameSetup;
  readonly entries: readonly RankingEntry[];
  /** Date printed on the card. */
  readonly date: Date;
}

const PODIUM = 3;

/** The picture people share: the top of one ranking, with the game's name and the date. Rendered off-screen. */
export const RankingShareCard = forwardRef<HTMLDivElement, RankingShareCardProps>(function RankingShareCard(
  { setup, entries, date },
  ref,
) {
  return (
    <div ref={ref} className={styles.card}>
      <div className={styles.title}>🏆 Ranking do Contorno</div>
      <div className={styles.board}>
        {describeSetup(setup)} · {date.toLocaleDateString('pt-BR')}
      </div>
      <div className={styles.table}>
        <div className={styles.head}>
          <div>#</div>
          <div>Jogador</div>
          <div className={styles.right}>Pontos</div>
          <div className={styles.right}>Tempo</div>
        </div>
        {entries.slice(0, SHARE_TOP).map((entry) => (
          <div key={entry.rank} className={cx(styles.row, entry.rank <= PODIUM && styles.podium)}>
            <div className={styles.rank}>{entry.rank}</div>
            <div className={styles.name}>{entry.name}</div>
            <div className={cx(styles.right, styles.points)}>{formatPoints(entry.points)}</div>
            <div className={cx(styles.right, styles.time)}>{formatDuration(entry.durationMs)}</div>
          </div>
        ))}
      </div>
      <div className={styles.footer}>contorno.fvrt.com.br</div>
    </div>
  );
});
