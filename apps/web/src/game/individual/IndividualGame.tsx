import {
  challengeFor,
  currentIndividualCountryId,
  currentIndividualPoints,
  getCountry,
  individualReducer,
  selectIndividualQuestions,
  startIndividual,
  type CountryId,
  type GameSetup,
  type Guess,
  type Random,
} from '@contorno/core';
import { useEffect, useReducer, useState } from 'react';
import { describeSetup } from '../../copy';
import { useTransient } from '../../hooks/useTransient';
import { LazyWorldMap } from '../../map/LazyWorldMap';
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
  const challenge = challengeFor(setup.mode);
  const [state, dispatch] = useReducer(individualReducer, setup, (initial) =>
    startIndividual(selectIndividualQuestions(initial.pool, random)),
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

  const currentId = currentIndividualCountryId(state);

  const guess = (attempt: Guess, blinkOn: CountryId, blinkMs: number) => {
    const event = { type: 'guess', guess: attempt } as const;
    if (individualReducer(state, event).wrongs > state.wrongs) {
      showFlash({ countryId: blinkOn, tone: 'wrong' }, blinkMs);
      shake(true, blinkMs);
    }
    dispatch(event);
  };

  const view = individualMapView(state, setup, flash);
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
          placeholder="Nome do país…"
          shaking={shaking !== null}
          settled={
            settled ? { text: getCountry(currentId).name, tone: settled.outcome === 'correct' ? 'ok' : 'bad' } : null
          }
          onSubmit={(text) => {
            guess({ type: 'text', value: text }, currentId, TYPED_BLINK_MS);
          }}
          onGiveUp={() => {
            dispatch({ type: 'give_up' });
          }}
        />
        <FeedbackLine feedback={feedback} />
      </>
    ) : (
      <LocatePanel
        countryName={getCountry(currentId).name}
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
        <LazyWorldMap
          tones={view.tones}
          focus={view.focus}
          {...(challenge === 'click' && {
            onCountryClick: (id: CountryId) => {
              const alreadySettled = state.results.some((result) => result.countryId === id);
              if (!alreadySettled) guess({ type: 'country', id }, id, CLICKED_BLINK_MS);
            },
          })}
          renderTooltip={(id) => {
            const result = state.results.find((entry) => entry.countryId === id);
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
