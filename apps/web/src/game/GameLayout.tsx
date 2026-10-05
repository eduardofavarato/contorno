import type { ReactNode } from 'react';
import { useBackAction } from '../hooks/useBackAction';
import styles from './GameLayout.module.css';

interface GameLayoutProps {
  readonly badge: string;
  readonly onQuit: () => void;
  /** Scores and counters shown in the header. */
  readonly stats?: ReactNode;
  /** Fraction of the game completed, 0 to 1. */
  readonly progress?: number;
  /** Interaction area under the map (answer field, turn info...). */
  readonly bottom?: ReactNode;
  /** The map. */
  readonly children: ReactNode;
}

/** Frame shared by every game screen: header, progress bar, map and a bottom panel. */
export function GameLayout({ badge, onQuit, stats, progress = 0, bottom, children }: GameLayoutProps) {
  useBackAction(onQuit);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.logo} onClick={onQuit} aria-label="Contorno — voltar ao início">
          Contorno
        </button>
        <span className={styles.badge}>{badge}</span>
        <div className={styles.stats}>{stats}</div>
        <button type="button" className={styles.quit} onClick={onQuit}>
          Sair
        </button>
      </header>
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={styles.progressFill} style={{ width: `${String(progress * 100)}%` }} />
      </div>
      {children}
      {bottom && <div className={styles.bottom}>{bottom}</div>}
    </div>
  );
}
