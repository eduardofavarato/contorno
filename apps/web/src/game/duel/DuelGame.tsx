import {
  activePlayer,
  duelReducer,
  duelResolutionDelayMs,
  selectDuelSetup,
  startDuel,
  toDuelView,
  type GameSetup,
  type Guess,
  type Random,
} from '@contorno/core';
import { useEffect, useReducer, useState } from 'react';
import { describeSetup, PLAYER_NAMES, PLAYER_SHORT_NAMES } from '../../copy';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DuelBoard } from './DuelBoard';
import { DuelResults } from './DuelResults';

interface DuelGameProps {
  readonly setup: GameSetup;
  readonly onQuit: () => void;
  readonly onPlayAgain: () => void;
  /** Source of randomness for picking the questions; injectable for tests. */
  readonly random?: Random;
}

/** Duel with both players on this device: the turn owner answers on the shared screen. */
export function DuelGame({ setup, onQuit, onPlayAgain, random = Math.random }: DuelGameProps) {
  const [state, dispatch] = useReducer(duelReducer, setup, (initial) =>
    startDuel(selectDuelSetup(initial.pool, random)),
  );
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const { resolution } = state;

  // A resolved question stays on screen for a moment, then the game moves on.
  useEffect(() => {
    if (!resolution) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'next' });
    }, duelResolutionDelayMs(resolution));
    return () => {
      clearTimeout(timer);
    };
  }, [resolution]);

  if (state.status === 'finished' && state.winner !== null) {
    return (
      <DuelResults
        names={PLAYER_NAMES}
        scores={state.scores}
        winner={state.winner}
        onPlayAgain={onPlayAgain}
        onHome={onQuit}
      />
    );
  }

  const player = activePlayer(state);

  return (
    <>
      <DuelBoard
        view={toDuelView(state)}
        setup={setup}
        names={PLAYER_NAMES}
        shortNames={PLAYER_SHORT_NAMES}
        badge={`${describeSetup(setup)} · Disputa`}
        canAct
        onGuess={(guess: Guess) => {
          dispatch({ type: 'guess', player, guess });
        }}
        onGiveUp={() => {
          dispatch({ type: 'give_up', player });
        }}
        onQuit={() => {
          setConfirmingQuit(true);
        }}
      />
      {confirmingQuit && (
        <ConfirmDialog
          title="Sair da disputa?"
          message="A partida será perdida."
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
