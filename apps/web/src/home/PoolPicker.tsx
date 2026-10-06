import type { ReactNode } from 'react';
import { BRASIL_TOPICS, CONTINENTS, type BrasilTopic, type GameMode, type Level } from '@contorno/core';
import { BRASIL_TOPIC_LABELS, LEVEL_LABELS } from '../copy';
import { OptionPicker } from '../ui/OptionPicker';
import styles from './Home.module.css';
import type { ModeSelection } from './modeSelection';

const LEVEL_OPTIONS = ([1, 2, 3] as const).map((value) => ({ value, label: LEVEL_LABELS[value] }));
const TOPIC_OPTIONS = BRASIL_TOPICS.map((value) => ({ value, label: BRASIL_TOPIC_LABELS[value] }));
const CONTINENT_OPTIONS = CONTINENTS.map(({ id, name }) => ({ value: id, label: name }));

export interface PoolPickerProps {
  readonly mode: GameMode;
  readonly selection: ModeSelection;
  readonly onChange: (selection: ModeSelection) => void;
  /** `scroll` is one row that scrolls sideways (the ranking's chips). */
  readonly layout?: 'default' | 'scroll';
  /** Shows the field's name ("Dificuldade", "Continente"…) above the options. */
  readonly labelled?: boolean;
}

/** What the games of a mode draw from: a difficulty level, a continent or a Brazilian topic. */
export function PoolPicker({ mode, selection, onChange, layout = 'default', labelled = false }: PoolPickerProps) {
  const scroll = layout === 'scroll';
  const field = (label: string, picker: ReactNode) =>
    labelled ? (
      <div className={styles.field}>
        <h3 className={styles.fieldLabel}>{label}</h3>
        {picker}
      </div>
    ) : (
      picker
    );

  switch (mode) {
    case 'continentes':
      return field(
        'Continente',
        <OptionPicker
          label="Continente"
          options={CONTINENT_OPTIONS}
          value={selection.continent}
          onChange={(continent) => {
            onChange({ ...selection, continent });
          }}
          layout={scroll ? 'scroll' : 'wrap'}
        />,
      );
    case 'brasil':
      return field(
        'Tema',
        <OptionPicker<BrasilTopic>
          label="Tema"
          options={TOPIC_OPTIONS}
          value={selection.topic}
          onChange={(topic) => {
            onChange({ ...selection, topic });
          }}
          layout={scroll ? 'scroll' : 'row'}
        />,
      );
    case 'perguntas':
    case 'localizar':
      return field(
        'Dificuldade',
        <OptionPicker<Level>
          label="Dificuldade"
          options={LEVEL_OPTIONS}
          value={selection.level}
          onChange={(level) => {
            onChange({ ...selection, level });
          }}
          layout={scroll ? 'scroll' : 'row'}
        />,
      );
  }
}
