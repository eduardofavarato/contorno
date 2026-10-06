import { useState } from 'react';
import type { GameMode } from '@contorno/core';
import { useAuth } from '../auth/authContext';
import { FREE_MODE_COPY, MODE_COPY } from '../copy';
import type { GameRequest } from '../navigation/types';
import { Button } from '../ui/Button';
import styles from './Home.module.css';
import { ModeSheet } from './ModeSheet';
import { ModeTile } from './ModeTile';

const MODES: readonly GameMode[] = ['perguntas', 'continentes', 'localizar', 'brasil'];

interface HomeScreenProps {
  readonly onPlay: (request: GameRequest) => void;
  readonly onPlayFree: () => void;
  readonly onLogin: () => void;
  /** Opens the account tab. */
  readonly onOpenAccount: () => void;
}

export function HomeScreen({ onPlay, onPlayFree, onLogin, onOpenAccount }: HomeScreenProps) {
  const { status, user } = useAuth();
  const [mode, setMode] = useState<GameMode | null>(null);

  return (
    <main className={styles.home}>
      <header className={styles.top}>
        <div>
          <h1 className={styles.logo}>Contorno</h1>
          <p className={styles.tagline}>Reconheça o País. Ou Não.</p>
        </div>
        {status === 'anonymous' && (
          <Button variant="secondary" className={styles.account} onClick={onLogin}>
            Entrar
          </Button>
        )}
        {status === 'signedIn' && (
          <Button variant="secondary" className={styles.account} onClick={onOpenAccount}>
            👤 {user?.name}
          </Button>
        )}
      </header>

      <section className={styles.modes} aria-label="Modos de jogo">
        <h2 className={styles.sectionTitle}>Todos os modos</h2>
        <div className={styles.grid}>
          {MODES.map((id) => (
            <ModeTile
              key={id}
              icon={MODE_COPY[id].icon}
              name={MODE_COPY[id].short}
              summary={MODE_COPY[id].summary}
              onClick={() => {
                setMode(id);
              }}
            />
          ))}
        </div>
        <ModeTile
          wide
          icon={FREE_MODE_COPY.icon}
          name={FREE_MODE_COPY.title}
          summary={FREE_MODE_COPY.summary}
          onClick={onPlayFree}
        />
      </section>

      {mode && (
        <ModeSheet
          mode={mode}
          onPlay={onPlay}
          onClose={() => {
            setMode(null);
          }}
        />
      )}
    </main>
  );
}
