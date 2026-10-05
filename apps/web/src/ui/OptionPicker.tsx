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
  /** `wrap`: two columns of options; `column`: one per line; default: a single row. */
  readonly layout?: 'row' | 'wrap' | 'column';
}

/** Single-choice picker (radio group) styled as a row of buttons. */
export function OptionPicker<T extends string | number>({
  label,
  options,
  value,
  onChange,
  layout = 'row',
}: OptionPickerProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cx(styles.group, layout !== 'row' && styles[layout])}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cx(styles.option, option.value === value && styles.selected)}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
