import styles from './TurnToast.module.css';

interface TurnToastProps {
  readonly name: string;
  readonly label: string;
}

/** Brief full-screen announcement of whose turn it is; mount it anew (via `key`) for each turn. */
export function TurnToast({ name, label }: TurnToastProps) {
  return (
    <div className={styles.toast} aria-hidden="true">
      <div className={styles.card}>
        <div className={styles.name}>{name}</div>
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  );
}
