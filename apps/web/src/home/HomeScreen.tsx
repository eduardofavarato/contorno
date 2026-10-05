import type { GameMode } from '@contorno/core';
import { AccountBar } from '../auth/AccountBar';
import { cx } from '../ui/cx';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { GameRequest } from '../navigation/types';
import { CompactHome } from './CompactHome';
import { FreeModeCard } from './FreeModeCard';
import styles from './Home.module.css';
import { ModeCard } from './ModeCard';

const MODES: readonly GameMode[] = ['perguntas', 'continentes', 'localizar', 'brasil'];

interface HomeScreenProps {
  readonly onPlay: (request: GameRequest) => void;
  readonly onPlayFree: () => void;
  readonly onLogin: () => void;
  readonly onOpenRanking: () => void;
}

export function HomeScreen({ onPlay, onPlayFree, onLogin, onOpenRanking }: HomeScreenProps) {
  const compact = useMediaQuery('(max-width: 480px)');

  return (
    <main className={cx(styles.home, compact && styles.homeCompact)}>
      <AccountBar onLogin={onLogin} onOpenRanking={onOpenRanking} />
      <h1 className={styles.logo}>Contorno</h1>
      <p className={styles.tagline}>Reconheça o País. Ou Não.</p>

      {compact ? (
        <CompactHome onPlay={onPlay} onPlayFree={onPlayFree} />
      ) : (
        <div className={styles.cards}>
          {MODES.map((mode) => (
            <ModeCard key={mode} mode={mode} onPlay={onPlay} />
          ))}
          <FreeModeCard onPlay={onPlayFree} />
        </div>
      )}
    </main>
  );
}
