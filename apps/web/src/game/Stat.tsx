import { cx } from '../ui/cx';
import styles from './Stat.module.css';

interface StatProps {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'gold' | 'green';
}

export function Stat({ label, value, tone }: StatProps) {
  return (
    <div className={styles.stat} role="group" aria-label={label}>
      <div className={styles.label}>{label}</div>
      <div className={cx(styles.value, tone && styles[tone])}>{value}</div>
    </div>
  );
}
