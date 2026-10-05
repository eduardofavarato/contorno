import type { ReactNode } from 'react';
import { useBackAction } from '../hooks/useBackAction';
import { Button } from './Button';
import styles from './ScreenShell.module.css';

interface ScreenShellProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly backLabel: string;
  readonly onBack: () => void;
}

/** Frame of the secondary screens (lobby, login, ranking): logo, title and a way back. */
export function ScreenShell({ title, children, backLabel, onBack }: ScreenShellProps) {
  useBackAction(onBack);

  return (
    <main className={styles.screen}>
      <div className={styles.logo}>Contorno</div>
      <h1 className={styles.title}>{title}</h1>
      {children}
      <Button variant="secondary" className={styles.back} onClick={onBack}>
        {backLabel}
      </Button>
    </main>
  );
}
