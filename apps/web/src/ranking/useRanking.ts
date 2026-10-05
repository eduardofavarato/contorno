import type { RankingResponse } from '@contorno/core';
import { useEffect, useState } from 'react';
import { gameApi } from '../api/gameApi';
import { errorMessage } from '../api/messages';
import { useAuth } from '../auth/authContext';

export type RankingState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly ranking: RankingResponse }
  | { readonly status: 'failed'; readonly message: string };

const LOADING: RankingState = { status: 'loading' };

/** The ranking of one board; refetched when the board changes or the player signs in or out. */
export function useRanking(boardKey: string): RankingState {
  const { status, withToken } = useAuth();
  const signedIn = status === 'signedIn';
  // The answer is remembered with the request it belongs to, so a new request shows "loading" without any reset.
  const request = `${boardKey}|${String(signedIn)}`;
  const [answer, setAnswer] = useState<{ readonly request: string; readonly state: RankingState } | null>(null);

  useEffect(() => {
    let current = true;
    // A signed-in player's request also carries their token, so the answer includes their own best game.
    const load = signedIn ? withToken((token) => gameApi.ranking(boardKey, token)) : gameApi.ranking(boardKey, null);
    load
      .then((ranking) => {
        if (current) setAnswer({ request, state: { status: 'ready', ranking } });
      })
      .catch((error: unknown) => {
        const message = errorMessage(error, 'Não foi possível carregar o ranking.');
        if (current) setAnswer({ request, state: { status: 'failed', message } });
      });
    return () => {
      current = false;
    };
  }, [boardKey, signedIn, withToken, request]);

  return answer?.request === request ? answer.state : LOADING;
}
