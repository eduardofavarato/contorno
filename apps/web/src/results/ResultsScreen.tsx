import { getCountry, MAX_POINTS, type IndividualResult } from '@contorno/core';
import { useBackAction } from '../hooks/useBackAction';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { formatPoints, plural } from '../utils/format';
import { ratingFor } from './rating';
import styles from './ResultsScreen.module.css';

interface ResultsScreenProps {
  readonly modeName: string;
  readonly score: number;
  readonly results: readonly IndividualResult[];
  readonly onPlayAgain: () => void;
  readonly onHome: () => void;
}

function attemptLabel(result: IndividualResult): string {
  if (result.outcome === 'gave_up') return 'Desistiu';
  if (result.outcome === 'failed') return 'Tentativas esgotadas';
  return result.wrongs === 0 ? 'Acertou de primeira!' : plural(result.wrongs, 'erro');
}

function pointsClass(points: number): string | undefined {
  if (points === MAX_POINTS) return styles.full;
  if (points >= 1500) return styles.good;
  return points > 0 ? styles.low : styles.none;
}

export function ResultsScreen({ modeName, score, results, onPlayAgain, onHome }: ResultsScreenProps) {
  useBackAction(onHome);
  const possible = results.length * MAX_POINTS;
  const rating = ratingFor(score / possible);

  return (
    <main className={styles.screen}>
      <div className={styles.logo}>Contorno</div>

      <section className={styles.card} aria-label="Pontuação final">
        <div className={styles.cardLabel}>Pontuação Final — {modeName}</div>
        <div className={styles.score}>{formatPoints(score)}</div>
        <div className={styles.scoreOf}>de {formatPoints(possible)} pontos possíveis</div>
        <div className={styles.rating}>{rating.label}</div>
        <div className={styles.stars} aria-label={plural(rating.stars, 'estrela')}>
          {'⭐'.repeat(rating.stars)}
        </div>
      </section>

      <section className={styles.review}>
        <h2>Resultado por País</h2>
        <ol className={styles.items}>
          {results.map((result, index) => (
            <li key={result.countryId} className={styles.item}>
              <div className={styles.number}>{index + 1}</div>
              <div className={styles.info}>
                <div className={styles.country}>{getCountry(result.countryId).name}</div>
                <div className={styles.attempt}>{attemptLabel(result)}</div>
              </div>
              <div className={cx(styles.points, pointsClass(result.points))}>{formatPoints(result.points)}</div>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.actions}>
        <Button onClick={onPlayAgain}>Jogar Novamente</Button>
        <Button variant="secondary" onClick={onHome}>
          Início
        </Button>
      </div>
    </main>
  );
}
