import type { PlayerIndex } from '@contorno/core';
import { useBackAction } from '../../hooks/useBackAction';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { formatPoints } from '../../utils/format';
import styles from './DuelResults.module.css';

interface DuelResultsProps {
  readonly names: readonly [string, string];
  readonly scores: readonly [number, number];
  readonly winner: PlayerIndex;
  readonly onPlayAgain: () => void;
  readonly onHome: () => void;
}

export function DuelResults({ names, scores, winner, onPlayAgain, onHome }: DuelResultsProps) {
  useBackAction(onHome);

  return (
    <main className={styles.screen}>
      <h1 className={styles.heading}>Fim da disputa</h1>

      <section className={styles.winner} aria-label="Vencedor">
        <div className={styles.winnerLabel}>Vencedor</div>
        <div className={styles.winnerText}>🏆 {names[winner]} vence!</div>
        <div className={styles.scores}>
          {([0, 1] as const).map((player) => (
            <div
              key={player}
              role="group"
              aria-label={names[player]}
              className={cx(styles.score, player === winner && styles.won)}
            >
              <span className={styles.scoreName}>{names[player]}</span>
              <strong>{formatPoints(scores[player])}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.actions}>
        <Button size="large" onClick={onPlayAgain}>
          Revanche
        </Button>
        <Button variant="secondary" size="large" onClick={onHome}>
          Início
        </Button>
      </div>
    </main>
  );
}
