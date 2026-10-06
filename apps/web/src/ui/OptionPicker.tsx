import { vibrate, HAPTICS } from '../haptics';
import { cx } from './cx';
import styles from './OptionPicker.module.css';

export interface PickerOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

interface OptionPickerProps<T extends string | number> {
  readonly label: string;
  readonly options: readonly PickerOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  /** `wrap`: two columns; `column`: one per line; `scroll`: one row that scrolls sideways; default: one row. */
  readonly layout?: 'row' | 'wrap' | 'column' | 'scroll';
  /** Options joined into one bar, for a choice between two or three things (e.g. the format). */
  readonly segmented?: boolean;
}

/** Single-choice picker (radio group) styled as buttons. */
export function OptionPicker<T extends string | number>({
  label,
  options,
  value,
  onChange,
  layout = 'row',
  segmented = false,
}: OptionPickerProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(styles.group, layout !== 'row' && styles[layout], segmented && styles.segmented)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cx(styles.option, option.value === value && styles.selected)}
          onClick={() => {
            vibrate(HAPTICS.tap);
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
