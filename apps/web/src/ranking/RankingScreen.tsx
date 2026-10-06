import { boardKeyFor, type GameMode, type GameSetup, type RankingEntry } from '@contorno/core';
import { useState } from 'react';
import { describeSetup, MODE_COPY } from '../copy';
import { useAuth } from '../auth/authContext';
import { DEFAULT_SELECTION, toSetup, type ModeSelection } from '../home/modeSelection';
import { PoolPicker } from '../home/ModeConfig';
import { Button } from '../ui/Button';
import { OptionPicker } from '../ui/OptionPicker';
import { ScreenShell } from '../ui/ScreenShell';
import { cx } from '../ui/cx';
import { formatDuration, formatPoints } from '../utils/format';
import { RankingShare } from './RankingShare';
import styles from './RankingScreen.module.css';
import { useRanking } from './useRanking';

const MODES: readonly GameMode[] = ['perguntas', 'continentes', 'localizar', 'brasil'];
const MODE_OPTIONS = MODES.map((value) => ({ value, label: MODE_COPY[value].title.replace(/^Modo /, '') }));
const PODIUM = 3;

interface RankingScreenProps {
  /** Board to open first, e.g. the one a player just finished a game on. */
  readonly initial?: GameSetup;
  readonly onBack: () => void;
  readonly onLogin: () => void;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

export function RankingScreen({ initial, onBack, onLogin }: RankingScreenProps) {
  const [mode, setMode] = useState<GameMode>(initial?.mode ?? 'perguntas');
  const [selection, setSelection] = useState<ModeSelection>(() => selectionFor(initial));
  const setup = toSetup(mode, selection);
  const board = boardKeyFor(setup);

  return (
    <ScreenShell title="🏆 Ranking" backLabel="← Voltar" onBack={onBack}>
      <div className={styles.pickers}>
        <OptionPicker label="Modo" options={MODE_OPTIONS} value={mode} onChange={setMode} layout="wrap" />
        <PoolPicker mode={mode} selection={selection} onChange={setSelection} layout="row" />
      </div>
      <Board key={board} setup={setup} onLogin={onLogin} />
    </ScreenShell>
  );
}

/** The selection that points at `setup`, so the pickers open on it. */
function selectionFor(setup: GameSetup | undefined): ModeSelection {
  if (!setup) return DEFAULT_SELECTION;
  switch (setup.pool.kind) {
    case 'level':
      return { ...DEFAULT_SELECTION, level: setup.pool.level };
    case 'continent':
      return { ...DEFAULT_SELECTION, continent: setup.pool.continent };
    case 'brasil':
      return { ...DEFAULT_SELECTION, topic: setup.pool.topic };
  }
}

function Board({ setup, onLogin }: { readonly setup: GameSetup; readonly onLogin: () => void }) {
  const { user, status } = useAuth();
  const state = useRanking(boardKeyFor(setup));

  if (state.status === 'loading') return <p className={styles.message}>Carregando…</p>;
  if (state.status === 'failed') {
    return (
      <p role="alert" className={styles.error}>
        {state.message}
      </p>
    );
  }

  const { entries, mine } = state.ranking;
  if (entries.length === 0) {
    return (
      <>
        <p className={styles.message}>Ninguém jogou {describeSetup(setup)} ainda. Seja o primeiro!</p>
        {status === 'anonymous' && <Button onClick={onLogin}>Entrar para jogar valendo</Button>}
      </>
    );
  }

  return (
    <>
      <table className={styles.table} aria-label={`Ranking de ${describeSetup(setup)}`}>
        <thead>
          <tr>
            <th>#</th>
            <th>Jogador</th>
            <th className={styles.right}>Pontos</th>
            <th className={styles.right}>Tempo</th>
            <th className={cx(styles.right, styles.date)}>Data</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <Row key={entry.rank} entry={entry} mine={entry.userId === user?.id} />
          ))}
        </tbody>
      </table>
      {mine && !entries.some((entry) => entry.rank === mine.rank) && (
        <p className={styles.yours}>
          Sua melhor: <strong>#{mine.rank}</strong> · {formatPoints(mine.points)} pts ·{' '}
          {formatDuration(mine.durationMs)}
        </p>
      )}
      <RankingShare setup={setup} entries={entries} />
      {status === 'anonymous' && <Button onClick={onLogin}>Entrar para aparecer no ranking</Button>}
    </>
  );
}

function Row({ entry, mine }: { readonly entry: RankingEntry; readonly mine: boolean }) {
  return (
    <tr className={cx(mine && styles.mine, entry.rank <= PODIUM && styles.top)}>
      <td className={styles.rank}>{entry.rank}</td>
      <td className={styles.name}>{entry.name}</td>
      <td className={styles.points}>{formatPoints(entry.points)}</td>
      <td className={styles.time}>{formatDuration(entry.durationMs)}</td>
      <td className={cx(styles.time, styles.date)}>{dateFormat.format(new Date(entry.finishedAt))}</td>
    </tr>
  );
}
