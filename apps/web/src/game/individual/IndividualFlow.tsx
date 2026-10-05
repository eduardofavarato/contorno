import { questionsFor, type GameSetup, type Question, type Random } from '@contorno/core';
import { useEffect, useRef, useState } from 'react';
import { gameApi } from '../../api/gameApi';
import { errorMessage } from '../../api/messages';
import { useAuth } from '../../auth/authContext';
import { IndividualGame, type RankingMode } from './IndividualGame';
import styles from './IndividualFlow.module.css';

interface IndividualFlowProps {
  readonly setup: GameSetup;
  readonly onQuit: () => void;
  readonly onPlayAgain: () => void;
  readonly onLogin: () => void;
  readonly onOpenRanking: (setup: GameSetup) => void;
  readonly random?: Random;
}

/**
 * Decides how a solo game counts: signed in, the server draws the questions and later checks the moves (ranked);
 * signed out, or when the server cannot be reached, it is a practice game that still plays fully.
 */
export function IndividualFlow({ setup, onQuit, onPlayAgain, onLogin, onOpenRanking, random }: IndividualFlowProps) {
  const { status } = useAuth();
  const common = { setup, onQuit, onPlayAgain, ...(random && { random }) };

  switch (status) {
    case 'loading':
      return <p className={styles.loading}>Carregando…</p>;
    case 'signedIn':
      return <RankedStart {...common} onOpenRanking={onOpenRanking} />;
    case 'anonymous':
      return <IndividualGame {...common} ranking={{ kind: 'invite', onLogin }} />;
    case 'unavailable':
      return <IndividualGame {...common} />;
  }
}

type Start =
  | { readonly status: 'starting' }
  | { readonly status: 'ready'; readonly gameId: string; readonly questions: readonly Question[] }
  | { readonly status: 'failed'; readonly reason: string };

function RankedStart({ setup, onQuit, onPlayAgain, onOpenRanking, random }: Omit<IndividualFlowProps, 'onLogin'>) {
  const { withToken } = useAuth();
  const [start, setStart] = useState<Start>({ status: 'starting' });
  const requested = useRef(false);

  useEffect(() => {
    // One request per game: React may run this effect twice in development, which would open two sessions.
    if (requested.current) return;
    requested.current = true;
    withToken((token) => gameApi.start(setup, token)).then(
      ({ gameId, questionIds }) => {
        const questions = questionsFor(setup, questionIds);
        setStart(
          questions
            ? { status: 'ready', gameId, questions }
            : { status: 'failed', reason: 'O servidor enviou perguntas desconhecidas.' },
        );
      },
      (error: unknown) => {
        setStart({ status: 'failed', reason: errorMessage(error, 'Não foi possível abrir a partida.') });
      },
    );
  }, [setup, withToken]);

  if (start.status === 'starting') return <p className={styles.loading}>Preparando a partida…</p>;
  if (start.status === 'failed') {
    return (
      <IndividualGame
        {...{ setup, onQuit, onPlayAgain }}
        {...(random && { random })}
        ranking={{ kind: 'unranked', reason: start.reason }}
      />
    );
  }

  const ranking: RankingMode = {
    kind: 'ranked',
    submit: (events) => withToken((token) => gameApi.finish(start.gameId, events, token)),
    onOpenRanking: () => {
      onOpenRanking(setup);
    },
  };
  return <IndividualGame {...{ setup, onQuit, onPlayAgain }} questions={start.questions} ranking={ranking} />;
}
