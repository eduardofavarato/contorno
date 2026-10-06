import { HAPTICS, vibrate } from '../../haptics';
import styles from './panel.module.css';

interface GiveUpButtonProps {
  readonly disabled: boolean;
  readonly onClick: () => void;
}

export function GiveUpButton({ disabled, onClick }: GiveUpButtonProps) {
  return (
    <button
      type="button"
      className={styles.giveUp}
      disabled={disabled}
      onClick={() => {
        vibrate(HAPTICS.tap);
        onClick();
      }}
    >
      Desistir
    </button>
  );
}
