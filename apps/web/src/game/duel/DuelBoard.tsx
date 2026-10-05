import { challengeFor, mapFor, type DuelView, type GameSetup, type Guess, type RegionId } from '@contorno/core';
import { quizCopy } from '../../copy';
import { useTransient } from '../../hooks/useTransient';
import { LazyMap } from '../../map/LazyMap';
import { cx } from '../../ui/cx';
import { GameLayout } from '../GameLayout';
import type { Flash } from '../individual/individualView';
import { AnswerForm } from '../panel/AnswerForm';
import { FeedbackLine } from '../panel/FeedbackLine';
import { LocatePanel } from '../panel/LocatePanel';
import { PanelInfo } from '../panel/PanelInfo';
import styles from './DuelBoard.module.css';
import { DuelTooltip } from './DuelTooltip';
import { duelFeedback, duelMapView, settledAnswer, stakesLabel, turnBanner } from './duelView';
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
  const challenge = challengeFor(setup);
  const asking = view.status === 'asking';
  const banner = turnBanner(view, names);
  const turnKey = `${String(view.round)}-${view.stage}-${String(view.tiebreakRound)}`;

  const question = view.question;
  const copy = quizCopy(setup);

  const clickRegion = (id: RegionId) => {
    if (!canAct || !asking || question === null) return;
    // Regions already painted are ignored, unless this very question is about one: a state can be the answer
    // for several cities.
    const painted = view.results.some((result) => result.question.regionId === id);
    if (painted && id !== question.regionId) return;
    if (id !== question.regionId) showFlash({ regionId: id, tone: 'wrong' }, CLICK_BLINK_MS);
    onGuess({ type: 'region', id });
  };

  const map = duelMapView(view, challenge, flash);
  const feedback = duelFeedback(view, names);
  const info = stakesLabel(view);

  const controls =
    challenge === 'type' ? (
      <>
        <PanelInfo>{info}</PanelInfo>
        <AnswerForm
          key={turnKey}
          label={copy.inputLabel}
          placeholder={canAct ? copy.inputPlaceholder : 'Vez do adversário…'}
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
        label={copy.locateLabel}
        prompt={question?.prompt ?? ''}
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
        <LazyMap
          map={mapFor(setup)}
          tones={map.tones}
          focus={map.focus}
          {...(challenge === 'click' && { onRegionClick: clickRegion })}
          renderTooltip={(id) => {
            const result = view.results.findLast((entry) => entry.question.regionId === id);
            return result && <DuelTooltip result={result} names={names} />;
          }}
        />
      </GameLayout>
      {asking && <TurnToast key={turnKey} name={banner.name} label={banner.label} />}
    </div>
  );
}
