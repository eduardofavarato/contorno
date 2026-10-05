import { useState } from 'react';
import type { GameMode } from '@contorno/core';
import { MODE_COPY } from '../copy';
import type { GameRequest } from '../navigation/types';
import styles from './Home.module.css';
import { ModeConfig } from './ModeConfig';
import { DEFAULT_SELECTION } from './modeSelection';

interface ModeCardProps {
  readonly mode: GameMode;
  readonly onPlay: (request: GameRequest) => void;
}

export function ModeCard({ mode, onPlay }: ModeCardProps) {
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const copy = MODE_COPY[mode];

  return (
    <section className={styles.card} aria-label={copy.title}>
      <div className={styles.cardIcon}>{copy.icon}</div>
      <h3 className={styles.cardTitle}>{copy.title}</h3>
      <div className={styles.cardDescription}>
        <p>{copy.description[selection.format]}</p>
        <details className={styles.details}>
          <summary>Detalhes</summary>
          <ul>
            {copy.details[selection.format].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      </div>
      <ModeConfig mode={mode} selection={selection} onChange={setSelection} onPlay={onPlay} />
    </section>
  );
}
