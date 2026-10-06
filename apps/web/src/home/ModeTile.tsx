import { HAPTICS, vibrate } from '../haptics';
import { Icon } from '../ui/Icon';
import styles from './Home.module.css';

interface ModeTileProps {
  /** An emoji. */
  readonly icon: string;
  readonly name: string;
  readonly summary: string;
  /** The free mode sits on its own row. */
  readonly wide?: boolean;
  readonly onClick: () => void;
}

/** A mode on the home screen: tapping it opens its setup (or starts it, for the free mode). */
export function ModeTile({ icon, name, summary, wide = false, onClick }: ModeTileProps) {
  return (
    <button
      type="button"
      className={wide ? styles.tileWide : styles.tile}
      onClick={() => {
        vibrate(HAPTICS.tap);
        onClick();
      }}
    >
      <span className={styles.tileIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.tileText}>
        <span className={styles.tileName}>{name}</span>
        <span className={styles.tileSummary}>{summary}</span>
      </span>
      {wide && (
        <span className={styles.tileChevron}>
          <Icon name="forward" size={22} />
        </span>
      )}
    </button>
  );
}
