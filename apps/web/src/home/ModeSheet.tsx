import type { GameMode } from '@contorno/core';
import { useEffect, useId, useRef, useState } from 'react';
import { FORMAT_LABELS, MODE_COPY } from '../copy';
import { HAPTICS, vibrate } from '../haptics';
import { useBackAction } from '../hooks/useBackAction';
import type { GameRequest } from '../navigation/types';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { OptionPicker } from '../ui/OptionPicker';
import styles from './ModeSheet.module.css';
import { DEFAULT_SELECTION, toRequest } from './modeSelection';
import { PoolPicker } from './PoolPicker';

const FORMAT_OPTIONS = (['individual', 'duel'] as const).map((value) => ({ value, label: FORMAT_LABELS[value] }));

interface ModeSheetProps {
  readonly mode: GameMode;
  readonly onPlay: (request: GameRequest) => void;
  readonly onClose: () => void;
}

/** Where a mode is set up: a sheet that slides up from the bottom on phones and a dialog on wide screens. */
export function ModeSheet({ mode, onPlay, onClose }: ModeSheetProps) {
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [rulesOpen, setRulesOpen] = useState(false);
  const titleId = useId();
  const rulesId = useId();
  const sheet = useRef<HTMLDivElement>(null);
  const copy = MODE_COPY[mode];
  useBackAction(onClose);

  useEffect(() => {
    sheet.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const play = (venue?: 'local' | 'online') => {
    vibrate(HAPTICS.press);
    onPlay(toRequest(mode, selection, venue));
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.sheet}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className={styles.grip} aria-hidden="true" />
        <header className={styles.header}>
          <span className={styles.icon} aria-hidden="true">
            {copy.icon}
          </span>
          <h2 id={titleId} className={styles.title}>
            {copy.title}
          </h2>
          <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
        </header>

        <p className={styles.description}>{copy.description[selection.format]}</p>

        <div className={styles.field}>
          <h3 className={styles.fieldLabel}>Formato</h3>
          <OptionPicker
            label="Formato"
            options={FORMAT_OPTIONS}
            value={selection.format}
            onChange={(format) => {
              setSelection({ ...selection, format });
            }}
            segmented
          />
        </div>

        <PoolPicker mode={mode} selection={selection} onChange={setSelection} labelled />

        <div className={styles.rules}>
          <button
            type="button"
            className={styles.rulesToggle}
            aria-expanded={rulesOpen}
            aria-controls={rulesId}
            onClick={() => {
              setRulesOpen((open) => !open);
            }}
          >
            Como funciona
            <span className={rulesOpen ? styles.chevronOpen : styles.chevron}>
              <Icon name="down" size={20} />
            </span>
          </button>
          {rulesOpen && (
            <ul id={rulesId} className={styles.rulesList}>
              {copy.details[selection.format].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>

        {selection.format === 'individual' ? (
          <Button
            size="large"
            onClick={() => {
              play();
            }}
          >
            Jogar
          </Button>
        ) : (
          <div className={styles.actions}>
            <Button
              size="large"
              onClick={() => {
                play('local');
              }}
            >
              Jogar (mesmo aparelho)
            </Button>
            <Button
              variant="online"
              className={styles.withIcon}
              size="large"
              onClick={() => {
                play('online');
              }}
            >
              <Icon name="wifi" size={22} />
              Jogar Online
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
