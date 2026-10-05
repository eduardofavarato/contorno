import { cx } from '../ui/cx';
import styles from './ResultTooltip.module.css';

interface ResultTooltipProps {
  readonly tone: 'ok' | 'bad' | 'playerA' | 'playerB';
  readonly heading: string;
  readonly name: string;
  readonly detail?: string;
}

/** Hover card for a country that has been answered. */
export function ResultTooltip({ tone, heading, name, detail }: ResultTooltipProps) {
  return (
    <>
      <div className={cx(styles.heading, styles[tone])}>{heading}</div>
      <div className={styles.name}>{name}</div>
      {detail && <div className={styles.detail}>{detail}</div>}
    </>
  );
}
