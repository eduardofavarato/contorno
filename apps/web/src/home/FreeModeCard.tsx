import { FREE_MODE_COPY } from '../copy';
import { Button } from '../ui/Button';
import styles from './Home.module.css';

export function FreeModeCard({ onPlay }: { readonly onPlay: () => void }) {
  return (
    <section className={styles.card} aria-label={FREE_MODE_COPY.title}>
      <div className={styles.cardIcon}>{FREE_MODE_COPY.icon}</div>
      <h3 className={styles.cardTitle}>{FREE_MODE_COPY.title}</h3>
      <div className={styles.cardDescription}>
        <p>{FREE_MODE_COPY.description}</p>
        <details className={styles.details}>
          <summary>Detalhes</summary>
          <ul>
            {FREE_MODE_COPY.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      </div>
      <Button onClick={onPlay}>Jogar</Button>
    </section>
  );
}
