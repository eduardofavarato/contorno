import { useState } from 'react';
import type { GameMode } from '@contorno/core';
import { FREE_MODE_COPY, MODE_COPY } from '../copy';
import { useBackAction } from '../hooks/useBackAction';
import type { GameRequest } from '../navigation/types';
import { Button } from '../ui/Button';
import styles from './Home.module.css';
import { ModeConfig } from './ModeConfig';
import { DEFAULT_SELECTION } from './modeSelection';

const MODES: readonly GameMode[] = ['perguntas', 'continentes', 'localizar'];

interface CompactHomeProps {
  readonly onPlay: (request: GameRequest) => void;
  readonly onPlayFree: () => void;
}

/** Phone layout: first pick a mode from a list, then configure it on its own screen. */
export function CompactHome({ onPlay, onPlayFree }: CompactHomeProps) {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [selection, setSelection] = useState(DEFAULT_SELECTION);

  // In a mode's settings, back returns to the list; on the list itself it leaves the app.
  useBackAction(() => {
    setMode(null);
  }, mode !== null);

  if (mode) {
    const copy = MODE_COPY[mode];
    return (
      <div className={styles.compactConfig}>
        <div className={styles.compactHeader}>
          <span className={styles.compactIcon}>{copy.icon}</span>
          <span className={styles.compactTitle}>{copy.title}</span>
        </div>
        <ModeConfig mode={mode} selection={selection} onChange={setSelection} onPlay={onPlay} layout="column" />
        <Button
          variant="secondary"
          onClick={() => {
            setMode(null);
          }}
        >
          ← Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.compactList}>
      {MODES.map((id) => (
        <ModeListItem
          key={id}
          {...MODE_COPY[id]}
          onClick={() => {
            setSelection(DEFAULT_SELECTION);
            setMode(id);
          }}
        />
      ))}
      <ModeListItem {...FREE_MODE_COPY} onClick={onPlayFree} />
    </div>
  );
}

interface ModeListItemProps {
  readonly icon: string;
  readonly title: string;
  readonly summary: string;
  readonly onClick: () => void;
}

function ModeListItem({ icon, title, summary, onClick }: ModeListItemProps) {
  return (
    <button type="button" className={styles.listItem} onClick={onClick}>
      <span className={styles.listIcon}>{icon}</span>
      <span className={styles.listInfo}>
        <span className={styles.listName}>{title}</span>
        <span className={styles.listSummary}>{summary}</span>
      </span>
      <span className={styles.chevron}>›</span>
    </button>
  );
}
