import { cx } from '../ui/cx';
import { CODE_LENGTH } from './code';
import styles from './Lobby.module.css';

interface CodeBoxesProps {
  readonly value: string;
  /** Shows the box that takes the next character as focused (while typing a code). */
  readonly focused?: boolean;
  readonly large?: boolean;
}

/** A room code drawn as one box per character. */
export function CodeBoxes({ value, focused = false, large = false }: CodeBoxesProps) {
  return (
    <div className={styles.boxes} aria-hidden="true">
      {Array.from({ length: CODE_LENGTH }, (_, index) => (
        <div
          key={index}
          className={cx(
            large ? styles.boxLarge : styles.box,
            value[index] && styles.boxFilled,
            focused && index === Math.min(value.length, CODE_LENGTH - 1) && styles.boxFocus,
          )}
        >
          {value[index]}
        </div>
      ))}
    </div>
  );
}
