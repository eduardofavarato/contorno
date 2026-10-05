import {
  challengeFor,
  getCountry,
  isCorrectGuess,
  type CountryId,
  type DuelView,
  type GameSetup,
  type Guess,
} from '@contorno/core';
import { useTransient } from '../../hooks/useTransient';
import { LazyWorldMap } from '../../map/LazyWorldMap';
import { cx } from '../../ui/cx';
import { GameLayout } from '../GameLayout';
import type { Flash } from '../individual/individualView';
import { AnswerForm } from '../panel/AnswerForm';
import { FeedbackLine } from '../panel/FeedbackLine';
import { LocatePanel } from '../panel/LocatePanel';
import { PanelInfo } from '../panel/PanelInfo';
import styles from './DuelBoard.module.css';
import { DuelTooltip } from './DuelTooltip';
import { currentName, duelFeedback, duelMapView, settledAnswer, stakesLabel, turnBanner } from './duelView';
import { ScoreBar } from './ScoreBar';
import { TurnToast } from './TurnToast';

const CLICK_BLINK_MS = 600;

interface DuelBoardProps {
  readonly view: DuelView;
  readonly setup: GameSetup;
  readonly names: readonly [string, string];
  /** Compact labels for narrow screens. */
  readonly shortNames: readonly [string, string];
  readonly badge: string;
  /** Whether this screen may answer right now; online, only the player whose turn it is. */
  readonly canAct: boolean;
  readonly onGuess: (guess: Guess) => void;
  readonly onGiveUp: () => void;
  readonly onQuit: () => void;
}

/** The duel screen, driven entirely by a `DuelView`: the same view serves local and online games. */
export function DuelBoard({
  view,
  setup,
  names,
  shortNames,
  badge,
  canAct,
  onGuess,
  onGiveUp,
  onQuit,
}: DuelBoardProps) {
  const [flash, showFlash] = useTransient<Flash>();
  const challenge = challengeFor(setup.mode);
  const asking = view.status === 'asking';
  const banner = turnBanner(view, names);
  const turnKey = `${String(view.round)}-${view.stage}-${String(view.tiebreakRound)}`;

  const clickCountry = (id: CountryId) => {
    if (!canAct || !asking || view.results.some((result) => result.countryId === id)) return;
    const guess: Guess = { type: 'country', id };
    if (view.countryId !== null && !isCorrectGuess(getCountry(view.countryId), guess)) {
      showFlash({ countryId: id, tone: 'wrong' }, CLICK_BLINK_MS);
    }
    onGuess(guess);
  };

  const map = duelMapView(view, setup, flash);
  const feedback = duelFeedback(view, names);
  const info = stakesLabel(view);

  const controls =
    challenge === 'type' ? (
      <>
        <PanelInfo>{info}</PanelInfo>
        <AnswerForm
          key={turnKey}
          placeholder={canAct ? 'Nome do país…' : 'Vez do adversário…'}
          disabled={!canAct}
          settled={settledAnswer(view)}
          canGiveUp={view.canGiveUp}
          onSubmit={(text) => {
            onGuess({ type: 'text', value: text });
          }}
          onGiveUp={onGiveUp}
        />
        <FeedbackLine feedback={feedback} />
      </>
    ) : (
      <LocatePanel
        countryName={currentName(view)}
        info={info}
        feedback={feedback}
        canGiveUp={canAct && view.canGiveUp}
        onGiveUp={onGiveUp}
      />
    );

  const inTiebreak = view.stage === 'tiebreak-first' || view.stage === 'tiebreak-second';

  return (
    <div className={cx(styles.root, view.activePlayer === 1 && styles.playerB)}>
      <GameLayout
        badge={badge}
        onQuit={onQuit}
        progress={inTiebreak ? 1 : view.round / view.questionCount}
        stats={
          <ScoreBar names={names} shortNames={shortNames} scores={view.scores} active={asking ? banner.player : null} />
        }
        bottom={
          <>
            <div className={styles.banner} role="group" aria-label="Turno">
              <div className={styles.dot} />
              <div className={styles.player}>{banner.name}</div>
              <div className={styles.label}>{banner.label}</div>
            </div>
            {controls}
          </>
        }
      >
        <LazyWorldMap
          tones={map.tones}
          focus={map.focus}
          {...(challenge === 'click' && { onCountryClick: clickCountry })}
          renderTooltip={(id) => {
            const result = view.results.find((entry) => entry.countryId === id);
            return result && <DuelTooltip result={result} names={names} />;
          }}
        />
      </GameLayout>
      {asking && <TurnToast key={turnKey} name={banner.name} label={banner.label} />}
    </div>
  );
}
