import type { PlayerIndex } from '@contorno/core';
import { useBackAction } from '../../hooks/useBackAction';
import { Button } from '../../ui/Button';
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
      <div className={styles.logo}>Contorno</div>

      <section className={styles.winner} aria-label="Vencedor">
        <div className={styles.winnerText}>🏆 {names[winner]} vence!</div>
      </section>

      <div className={styles.scores}>
        {([0, 1] as const).map((player) => (
          <div key={player} role="group" aria-label={names[player]}>
            {names[player]}
            <strong>{formatPoints(scores[player])}</strong>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button onClick={onPlayAgain}>Jogar Novamente</Button>
        <Button variant="secondary" onClick={onHome}>
          Início
        </Button>
      </div>
    </main>
  );
}
