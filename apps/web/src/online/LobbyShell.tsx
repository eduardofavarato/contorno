import type { ReactNode } from 'react';
import { useBackAction } from '../hooks/useBackAction';
import { Button } from '../ui/Button';
import styles from './Lobby.module.css';

interface LobbyShellProps {
  readonly children: ReactNode;
  readonly backLabel: string;
  readonly onBack: () => void;
}

/** Frame of the online lobby screens: logo, title and a way back. */
export function LobbyShell({ children, backLabel, onBack }: LobbyShellProps) {
  useBackAction(onBack);

  return (
    <main className={styles.screen}>
      <div className={styles.logo}>Contorno</div>
      <h1 className={styles.title}>⚔️ Disputa Online</h1>
      {children}
      <Button variant="secondary" className={styles.back} onClick={onBack}>
        {backLabel}
      </Button>
    </main>
  );
}
