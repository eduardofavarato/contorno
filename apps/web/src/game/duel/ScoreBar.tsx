import type { PlayerIndex } from '@contorno/core';
import { cx } from '../../ui/cx';
import { formatPoints } from '../../utils/format';
import styles from './ScoreBar.module.css';

interface ScoreBarProps {
  readonly names: readonly [string, string];
  /** Shown instead of `names` on narrow screens. */
  readonly shortNames: readonly [string, string];
  readonly scores: readonly [number, number];
  readonly active: PlayerIndex | null;
}

/** Both scores side by side, with the player whose turn it is highlighted. */
export function ScoreBar({ names, shortNames, scores, active }: ScoreBarProps) {
  const players = ([0, 1] as const).map((index) => (
    <div
      key={index}
      role="group"
      aria-label={names[index]}
      className={cx(styles.player, index === 0 ? styles.playerA : styles.playerB, active === index && styles.active)}
    >
      <div className={styles.name}>
        <span className={styles.full}>{names[index]}</span>
        <span className={styles.short}>{shortNames[index]}</span>
      </div>
      <div className={styles.score}>{formatPoints(scores[index])}</div>
    </div>
  ));

  return (
    <div className={styles.bar}>
      {players[0]}
      <span className={styles.versus}>VS</span>
      {players[1]}
    </div>
  );
}
