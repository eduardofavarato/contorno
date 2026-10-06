import { useRef, useState, type SubmitEvent } from 'react';
import { cx } from '../../ui/cx';
import styles from './panel.module.css';

interface AnswerFormProps {
  /** Accessible name of the field. */
  readonly label: string;
  readonly placeholder: string;
  /** The answer once the question is settled; the form shows it and locks. */
  readonly settled?: { readonly text: string; readonly tone: 'ok' | 'bad' } | null;
  readonly disabled?: boolean;
  /** Blinks the field red, e.g. after a wrong answer. */
  readonly shaking?: boolean;
  readonly onSubmit: (text: string) => void;
}

/** Typed-answer controls: text field and confirm. */
export function AnswerForm({
  label,
  placeholder,
  settled = null,
  disabled = false,
  shaking = false,
  onSubmit,
}: AnswerFormProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const locked = disabled || settled !== null;

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked || text.trim() === '') return;
    onSubmit(text);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <form className={styles.row} onSubmit={submit}>
      <input
        ref={inputRef}
        className={cx(
          styles.input,
          settled?.tone === 'ok' && styles.ok,
          (settled?.tone === 'bad' || shaking) && styles.bad,
          shaking && styles.shake,
        )}
        type="text"
        aria-label={label}
        placeholder={placeholder}
        value={settled ? settled.text : text}
        disabled={locked}
        autoFocus={!locked}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      <button type="submit" className={styles.confirm} disabled={locked}>
        Confirmar
      </button>
    </form>
  );
}
