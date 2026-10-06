import { quizFor, type DuelView, type GameSetup, type Guess, type PlayerIndex, type RegionId } from '@contorno/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { quizCopy } from '../../copy';
import { HAPTICS, vibrate } from '../../haptics';
import { useTransient } from '../../hooks/useTransient';
import { LazyMap } from '../../map/LazyMap';
import { cx } from '../../ui/cx';
import { GameLayout } from '../GameLayout';
import type { Flash } from '../individual/individualView';
import { AnswerForm } from '../panel/AnswerForm';
import { FeedbackLine } from '../panel/FeedbackLine';
import { GiveUpButton } from '../panel/GiveUpButton';
import { LocatePanel } from '../panel/LocatePanel';
import { PanelInfo } from '../panel/PanelInfo';
import styles from './DuelBoard.module.css';
import { DuelTooltip } from './DuelTooltip';
import { duelFeedback, duelMapView, settledAnswer, stakesLabel, turnBanner } from './duelView';
import { ScoreBar } from './ScoreBar';
import { TurnToast } from './TurnToast';

const CLICK_BLINK_MS = 600;
const SHAKE_MS = 350;

interface DuelBoardProps {
  readonly view: DuelView;
  readonly setup: GameSetup;
  readonly names: readonly [string, string];
  readonly badge: string;
  /** Whether this screen may answer right now; online, only the player whose turn it is. */
  readonly canAct: boolean;
  readonly onGuess: (guess: Guess) => void;
  readonly onGiveUp: () => void;
  readonly onQuit: () => void;
}

/** The duel screen, driven entirely by a `DuelView`: the same view serves local and online games. */
export function DuelBoard({ view, setup, names, badge, canAct, onGuess, onGiveUp, onQuit }: DuelBoardProps) {
  const [flash, showFlash] = useTransient<Flash>();
  const [shaking, shake] = useTransient<true>();
  const [bump, setBump] = useState<{ player: PlayerIndex; key: number } | null>(null);
  const previousScores = useRef(view.scores);
  const quiz = useMemo(() => quizFor(setup), [setup]);
  const { challenge } = quiz;
  const asking = view.status === 'asking';
  const banner = turnBanner(view, names);
  const turnKey = `${String(view.round)}-${view.stage}-${String(view.tiebreakRound)}`;

  const question = view.question;
  const copy = quizCopy(setup);

  const clickRegion = (id: RegionId) => {
    if (!canAct || !asking || question === null) return;
    // Regions already painted are ignored, unless this very question is about one: a state can be the answer
    // for several cities.
    if (map.tones.has(id) && id !== question.regionId) return;
    if (id !== question.regionId) showFlash({ regionId: id, tone: 'wrong' }, CLICK_BLINK_MS);
    onGuess({ type: 'region', id });
  };

  const map = duelMapView(view, quiz, flash);
  const feedback = duelFeedback(view, names);
  const info = stakesLabel(view);
  const feedbackTone = feedback?.tone;

  // A buzz for every answer (a short one when right, a double one when wrong), and the scoreboard pulses on a point.
  useEffect(() => {
    if (!feedbackTone) return;
    if (feedbackTone === 'ok') {
      vibrate(HAPTICS.right);
    } else {
      vibrate(HAPTICS.wrong);
      shake(true, SHAKE_MS);
    }
  }, [view.resolution, feedbackTone, shake]);

  useEffect(() => {
    const before = previousScores.current;
    previousScores.current = view.scores;
    const scorer = ([0, 1] as const).find((player) => view.scores[player] > before[player]);
    if (scorer !== undefined) setBump((current) => ({ player: scorer, key: (current?.key ?? 0) + 1 }));
  }, [view.scores]);

  const giveUpOff = !canAct || !view.canGiveUp || (challenge === 'type' && settledAnswer(view) !== null);

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
          shaking={shaking !== null}
          onSubmit={(text) => {
            onGuess({ type: 'text', value: text });
          }}
        />
        <FeedbackLine feedback={feedback} />
      </>
    ) : (
      <LocatePanel label={copy.locateLabel} prompt={question?.prompt ?? ''} info={info} feedback={feedback} />
    );

  const inTiebreak = view.stage === 'tiebreak-first' || view.stage === 'tiebreak-second';

  return (
    <div className={cx(styles.root, view.activePlayer === 1 && styles.playerB)}>
      <GameLayout
        badge={badge}
        onQuit={onQuit}
        progress={inTiebreak ? 1 : view.round / view.questionCount}
        stats={
          <span className={styles.round}>
            {inTiebreak ? '🔥' : `${String(view.round + 1)}/${String(view.questionCount)}`}
          </span>
        }
        scores={<ScoreBar names={names} scores={view.scores} active={asking ? banner.player : null} bump={bump} />}
        mapAction={<GiveUpButton disabled={giveUpOff} onClick={onGiveUp} />}
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
          map={quiz.map}
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
