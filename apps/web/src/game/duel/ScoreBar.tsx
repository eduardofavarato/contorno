import type { PlayerIndex } from '@contorno/core';
import { cx } from '../../ui/cx';
import { formatPoints } from '../../utils/format';
import styles from './ScoreBar.module.css';

interface ScoreBarProps {
  readonly names: readonly [string, string];
  readonly scores: readonly [number, number];
  readonly active: PlayerIndex | null;
  /** Which player's score just went up, with a counter that changes at every point, so the score can pulse. */
  readonly bump?: { readonly player: PlayerIndex; readonly key: number } | null;
}

/**
 * Both scores side by side, with the player whose turn it is highlighted. The players differ by shape as well as by
 * color (circle and square), so the turn does not rely on color alone.
 */
export function ScoreBar({ names, scores, active, bump = null }: ScoreBarProps) {
  return (
    <div className={styles.bar}>
      {([0, 1] as const).map((index) => (
        <div
          key={index}
          role="group"
          aria-label={names[index]}
          className={cx(
            styles.player,
            index === 0 ? styles.playerA : styles.playerB,
            active === index && styles.active,
          )}
        >
          <span className={styles.marker} aria-hidden="true" />
          <div className={styles.text}>
            <div className={styles.name}>{names[index]}</div>
            <div
              // The key restarts the pulse each time this player scores.
              key={bump?.player === index ? bump.key : 'idle'}
              className={cx(styles.score, bump?.player === index && styles.bump)}
            >
              {formatPoints(scores[index])}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
