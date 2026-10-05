import {
  currentIndividualPoints,
  currentIndividualQuestion,
  individualReducer,
  quizFor,
  selectIndividualQuestions,
  startIndividual,
  type GameSetup,
  type Guess,
  type Random,
  type RegionId,
} from '@contorno/core';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { describeSetup, quizCopy } from '../../copy';
import { useTransient } from '../../hooks/useTransient';
import { LazyMap } from '../../map/LazyMap';
import { ResultsScreen } from '../../results/ResultsScreen';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { formatPoints } from '../../utils/format';
import { GameLayout } from '../GameLayout';
import { LocatePanel } from '../panel/LocatePanel';
import { FeedbackLine } from '../panel/FeedbackLine';
import { AnswerForm } from '../panel/AnswerForm';
import { PanelInfo } from '../panel/PanelInfo';
import { Stat } from '../Stat';
import { IndividualTooltip } from './IndividualTooltip';
import { individualMapView, type Flash } from './individualView';
import { resolutionDelayMs, resolutionFeedback, wrongGuessFeedback, wrongsLabel } from './messages';

const TYPED_BLINK_MS = 380;
const CLICKED_BLINK_MS = 600;

interface IndividualGameProps {
  readonly setup: GameSetup;
  readonly onQuit: () => void;
  readonly onPlayAgain: () => void;
  /** Source of randomness for picking the questions; injectable for tests. */
  readonly random?: Random;
}

export function IndividualGame({ setup, onQuit, onPlayAgain, random = Math.random }: IndividualGameProps) {
  const quiz = useMemo(() => quizFor(setup), [setup]);
  const { challenge } = quiz;
  const [state, dispatch] = useReducer(individualReducer, quiz, (initial) =>
    startIndividual(selectIndividualQuestions(initial, random)),
  );
  const [flash, showFlash] = useTransient<Flash>();
  const [shaking, shake] = useTransient<true>();
  const [confirmingQuit, setConfirmingQuit] = useState(false);

  const settled = state.status === 'resolved' ? state.results.at(-1) : undefined;

  // A settled question stays on screen for a moment, then the next one comes up.
  useEffect(() => {
    if (!settled) return;
    const timer = setTimeout(
      () => {
        dispatch({ type: 'next' });
      },
      resolutionDelayMs(settled, challenge),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [settled, challenge]);

  if (state.status === 'finished') {
    return (
      <ResultsScreen
        modeName={describeSetup(setup)}
        score={state.score}
        results={state.results}
        onPlayAgain={onPlayAgain}
        onHome={onQuit}
      />
    );
  }

  const question = currentIndividualQuestion(state);
  const copy = quizCopy(setup);

  const guess = (attempt: Guess, blinkOn: RegionId, blinkMs: number) => {
    const event = { type: 'guess', guess: attempt } as const;
    if (individualReducer(state, event).wrongs > state.wrongs) {
      showFlash({ regionId: blinkOn, tone: 'wrong' }, blinkMs);
      shake(true, blinkMs);
    }
    dispatch(event);
  };

  const view = individualMapView(state, quiz, flash);
  const feedback = settled
    ? resolutionFeedback(settled, challenge)
    : state.wrongs > 0
      ? wrongGuessFeedback(challenge, state.wrongs)
      : null;
  const points = (
    <>
      Pontos disponíveis: <span>{formatPoints(currentIndividualPoints(state))}</span>
    </>
  );

  const bottom =
    challenge === 'type' ? (
      <>
        <PanelInfo warning={wrongsLabel(state.wrongs)}>{points}</PanelInfo>
        <AnswerForm
          key={state.index}
          label={copy.inputLabel}
          placeholder={copy.inputPlaceholder}
          shaking={shaking !== null}
          settled={settled ? { text: question.answer, tone: settled.outcome === 'correct' ? 'ok' : 'bad' } : null}
          onSubmit={(text) => {
            guess({ type: 'text', value: text }, question.regionId, TYPED_BLINK_MS);
          }}
          onGiveUp={() => {
            dispatch({ type: 'give_up' });
          }}
        />
        <FeedbackLine feedback={feedback} />
      </>
    ) : (
      <LocatePanel
        label={copy.locateLabel}
        prompt={question.prompt ?? question.answer}
        info={points}
        warning={wrongsLabel(state.wrongs)}
        feedback={feedback}
        canGiveUp={settled === undefined}
        onGiveUp={() => {
          dispatch({ type: 'give_up' });
        }}
      />
    );

  return (
    <>
      <GameLayout
        badge={describeSetup(setup)}
        onQuit={() => {
          setConfirmingQuit(true);
        }}
        progress={state.index / state.questions.length}
        stats={
          <>
            <Stat label="Pergunta" value={`${String(state.index + 1)}/${String(state.questions.length)}`} />
            <Stat label="Pontuação" value={formatPoints(state.score)} tone="gold" />
          </>
        }
        bottom={bottom}
      >
        <LazyMap
          map={quiz.map}
          tones={view.tones}
          focus={view.focus}
          {...(challenge === 'click' && {
            onRegionClick: (id: RegionId) => {
              // Regions already painted are ignored, unless this very question is about one: a state can be
              // the answer for several cities.
              const painted = state.results.some((result) => result.question.regionId === id);
              if (!painted || id === question.regionId) guess({ type: 'region', id }, id, CLICKED_BLINK_MS);
            },
          })}
          renderTooltip={(id) => {
            const result = state.results.findLast((entry) => entry.question.regionId === id);
            return result && <IndividualTooltip result={result} />;
          }}
        />
      </GameLayout>

      {confirmingQuit && (
        <ConfirmDialog
          title="Sair da partida?"
          message="Seu progresso será perdido."
          confirmLabel="Sair"
          cancelLabel="Continuar"
          onConfirm={onQuit}
          onCancel={() => {
            setConfirmingQuit(false);
          }}
        />
      )}
    </>
  );
}
