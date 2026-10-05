import type { ReactNode } from 'react';
import styles from './panel.module.css';

interface PanelInfoProps {
  readonly children: ReactNode;
  /** Right-aligned warning, e.g. the mistakes so far. */
  readonly warning?: string;
}

export function PanelInfo({ children, warning }: PanelInfoProps) {
  return (
    <div className={styles.info}>
      <div className={styles.points}>{children}</div>
      {warning && <div className={styles.wrongs}>{warning}</div>}
    </div>
  );
}
