import { BRASIL_TOPICS, CONTINENTS, type BrasilTopic, type GameMode, type Level } from '@contorno/core';
import { BRASIL_TOPIC_LABELS, FORMAT_LABELS, LEVEL_LABELS } from '../copy';
import type { GameRequest } from '../navigation/types';
import { Button } from '../ui/Button';
import { OptionPicker } from '../ui/OptionPicker';
import styles from './Home.module.css';
import { toRequest, type ModeSelection } from './modeSelection';

const FORMAT_OPTIONS = (['individual', 'duel'] as const).map((value) => ({ value, label: FORMAT_LABELS[value] }));
const LEVEL_OPTIONS = ([1, 2, 3] as const).map((value) => ({ value, label: LEVEL_LABELS[value] }));
const TOPIC_OPTIONS = BRASIL_TOPICS.map((value) => ({ value, label: BRASIL_TOPIC_LABELS[value] }));
const CONTINENT_OPTIONS = CONTINENTS.map(({ id, name }) => ({ value: id, label: name }));

interface ModeConfigProps {
  readonly mode: GameMode;
  readonly selection: ModeSelection;
  readonly onChange: (selection: ModeSelection) => void;
  readonly onPlay: (request: GameRequest) => void;
  readonly layout?: 'row' | 'column';
}

/** Format, pool and play buttons of one mode; shared by the desktop card and the compact (mobile) screen. */
export function ModeConfig({ mode, selection, onChange, onPlay, layout = 'row' }: ModeConfigProps) {
  return (
    <div className={styles.config}>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>Formato</div>
        <OptionPicker
          label="Formato"
          options={FORMAT_OPTIONS}
          value={selection.format}
          onChange={(format) => {
            onChange({ ...selection, format });
          }}
          layout={layout}
        />
      </div>

      <PoolPicker mode={mode} selection={selection} onChange={onChange} layout={layout} />

      {selection.format === 'individual' ? (
        <Button
          onClick={() => {
            onPlay(toRequest(mode, selection));
          }}
        >
          Jogar
        </Button>
      ) : (
        <>
          <Button
            onClick={() => {
              onPlay(toRequest(mode, selection, 'local'));
            }}
          >
            Jogar (Local)
          </Button>
          <Button
            variant="online"
            onClick={() => {
              onPlay(toRequest(mode, selection, 'online'));
            }}
          >
            🌐 Jogar Online
          </Button>
        </>
      )}
    </div>
  );
}

interface PoolPickerProps {
  readonly mode: GameMode;
  readonly selection: ModeSelection;
  readonly onChange: (selection: ModeSelection) => void;
  readonly layout: 'row' | 'column';
}

/** What the games of a mode draw from: a difficulty level, a continent or a Brazilian topic. */
function PoolPicker({ mode, selection, onChange, layout }: PoolPickerProps) {
  switch (mode) {
    case 'continentes':
      return (
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Continente</div>
          <OptionPicker
            label="Continente"
            options={CONTINENT_OPTIONS}
            value={selection.continent}
            onChange={(continent) => {
              onChange({ ...selection, continent });
            }}
            layout={layout === 'column' ? 'column' : 'wrap'}
          />
        </div>
      );
    case 'brasil':
      return (
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Tema</div>
          <OptionPicker<BrasilTopic>
            label="Tema"
            options={TOPIC_OPTIONS}
            value={selection.topic}
            onChange={(topic) => {
              onChange({ ...selection, topic });
            }}
            layout={layout}
          />
        </div>
      );
    case 'perguntas':
    case 'localizar':
      return (
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Dificuldade</div>
          <OptionPicker<Level>
            label="Dificuldade"
            options={LEVEL_OPTIONS}
            value={selection.level}
            onChange={(level) => {
              onChange({ ...selection, level });
            }}
            layout={layout}
          />
        </div>
      );
  }
}
