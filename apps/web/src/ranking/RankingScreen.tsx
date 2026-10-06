import { boardKeyFor, type GameMode, type GameSetup, type RankingEntry } from '@contorno/core';
import { useState } from 'react';
import { useAuth } from '../auth/authContext';
import { describeSetup, MODE_COPY } from '../copy';
import { DEFAULT_SELECTION, toSetup, type ModeSelection } from '../home/modeSelection';
import { PoolPicker } from '../home/PoolPicker';
import { Button } from '../ui/Button';
import { OptionPicker } from '../ui/OptionPicker';
import { cx } from '../ui/cx';
import { formatDuration, formatPoints } from '../utils/format';
import { RankingShare } from './RankingShare';
import styles from './RankingScreen.module.css';
import { useRanking, type RankingState } from './useRanking';

const MODES: readonly GameMode[] = ['perguntas', 'continentes', 'localizar', 'brasil'];
const MODE_OPTIONS = MODES.map((value) => ({ value, label: MODE_COPY[value].short }));
const PODIUM = 3;

interface RankingScreenProps {
  /** Board to open first, e.g. the one a player just finished a game on. */
  readonly initial?: GameSetup;
  readonly onLogin: () => void;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** The Ranking tab: pick a mode and its pool, see the podium, the rest of the list and the player's own best game. */
export function RankingScreen({ initial, onLogin }: RankingScreenProps) {
  const { user, status } = useAuth();
  const [mode, setMode] = useState<GameMode>(initial?.mode ?? 'perguntas');
  const [selection, setSelection] = useState<ModeSelection>(() => selectionFor(initial));
  const setup = toSetup(mode, selection);
  const state = useRanking(boardKeyFor(setup));
  const entries = state.status === 'ready' ? state.ranking.entries : [];
  const mine = state.status === 'ready' ? state.ranking.mine : null;

  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.heading}>Ranking</h1>
          {entries.length > 0 && <RankingShare setup={setup} entries={entries} />}
        </header>

        <div className={styles.pickers}>
          <OptionPicker label="Modo" options={MODE_OPTIONS} value={mode} onChange={setMode} layout="scroll" />
          <PoolPicker mode={mode} selection={selection} onChange={setSelection} layout="scroll" />
        </div>

        <h2 className={styles.board}>{describeSetup(setup)}</h2>
        <Board state={state} setup={setup} userId={user?.id} anonymous={status === 'anonymous'} onLogin={onLogin} />
      </div>

      {mine && (
        <aside className={styles.mine} aria-label="Sua melhor partida">
          <span className={styles.mineRank}>#{mine.rank}</span>
          <span className={styles.mineText}>
            <strong>Sua melhor</strong> · {formatDuration(mine.durationMs)}
          </span>
          <span className={styles.minePoints}>{formatPoints(mine.points)} pts</span>
        </aside>
      )}
    </main>
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

interface BoardProps {
  readonly state: RankingState;
  readonly setup: GameSetup;
  readonly userId: number | undefined;
  readonly anonymous: boolean;
  readonly onLogin: () => void;
}

function Board({ state, setup, userId, anonymous, onLogin }: BoardProps) {
  if (state.status === 'loading') return <p className={styles.message}>Carregando…</p>;
  if (state.status === 'failed') {
    return (
      <p role="alert" className={styles.error}>
        {state.message}
      </p>
    );
  }

  const { entries } = state.ranking;
  if (entries.length === 0) {
    return (
      <>
        <p className={styles.message}>Ninguém jogou {describeSetup(setup)} ainda. Seja o primeiro!</p>
        {anonymous && <Button onClick={onLogin}>Entrar para jogar valendo</Button>}
      </>
    );
  }

  const podium = entries.filter((entry) => entry.rank <= PODIUM);
  const rest = entries.filter((entry) => entry.rank > PODIUM);

  return (
    <>
      <ol className={styles.podium} aria-label={`Pódio de ${describeSetup(setup)}`}>
        {podium.map((entry) => (
          <li key={entry.rank} className={cx(styles.place, entry.rank === 1 && styles.first)} data-rank={entry.rank}>
            <div className={styles.placeRank}>{entry.rank}</div>
            <div className={styles.placeName}>{entry.name}</div>
            <div className={styles.placePoints}>{formatPoints(entry.points)}</div>
            <div className={styles.placeTime}>{formatDuration(entry.durationMs)}</div>
          </li>
        ))}
      </ol>
      {rest.length > 0 && (
        <ol className={styles.list} start={PODIUM + 1} aria-label={`Ranking de ${describeSetup(setup)}`}>
          {rest.map((entry) => (
            <Row key={entry.rank} entry={entry} mine={entry.userId === userId} />
          ))}
        </ol>
      )}
      {anonymous && <Button onClick={onLogin}>Entrar para aparecer no ranking</Button>}
    </>
  );
}

function Row({ entry, mine }: { readonly entry: RankingEntry; readonly mine: boolean }) {
  return (
    <li className={cx(styles.row, mine && styles.rowMine)}>
      <span className={styles.rank}>{entry.rank}</span>
      <span className={styles.name}>{entry.name}</span>
      <span className={styles.date}>{dateFormat.format(new Date(entry.finishedAt))}</span>
      <span className={styles.time}>{formatDuration(entry.durationMs)}</span>
      <span className={styles.points}>{formatPoints(entry.points)}</span>
    </li>
  );
}
