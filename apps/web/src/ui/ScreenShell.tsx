import type { ReactNode } from 'react';
import { useBackAction } from '../hooks/useBackAction';
import { Icon } from './Icon';
import styles from './ScreenShell.module.css';

interface ScreenShellProps {
  readonly title: string;
  readonly children: ReactNode;
  /** Accessible name of the back arrow, e.g. "Voltar" or "Cancelar". */
  readonly backLabel: string;
  readonly onBack: () => void;
}

/** Frame of the secondary screens (login, online lobby): a back arrow and the title, then the content. */
export function ScreenShell({ title, children, backLabel, onBack }: ScreenShellProps) {
  useBackAction(onBack);

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.back} aria-label={backLabel} onClick={onBack}>
          <Icon name="back" size={26} />
        </button>
        <h1 className={styles.title}>{title}</h1>
      </header>
      <div className={styles.content}>{children}</div>
    </main>
  );
}
