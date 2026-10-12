import { boardKeyFor, type GameSetup } from '@contorno/core';
import { useAuth } from '../auth/authContext';
import { describeSetup } from '../copy';
import { useRanking } from '../ranking/useRanking';
import { formatDuration, formatPoints } from '../utils/format';
import styles from './BestGame.module.css';

interface BestGameProps {
  readonly setup: GameSetup;
  readonly onLogin: () => void;
}

/**
 * The player's best game on a setup's ranking, or why there is none: they have never played it, or they are not
 * signed in. Shows nothing when the server has no accounts (there is no ranking) or the lookup fails.
 */
export function BestGame({ setup, onLogin }: BestGameProps) {
  const { status } = useAuth();

  if (status === 'anonymous') {
    return (
      <button type="button" className={styles.invite} onClick={onLogin}>
        Entre para registrar seu melhor
      </button>
    );
  }
  return status === 'signedIn' ? <SignedInBest setup={setup} /> : null;
}

function SignedInBest({ setup }: { readonly setup: GameSetup }) {
  // One entry is enough: the answer carries the player's own best game whether or not it is in that list.
  const state = useRanking(boardKeyFor(setup), 1);

  if (state.status === 'failed') return null;
  if (state.status === 'loading') return <p className={styles.line}>Carregando seu melhor…</p>;

  const { mine } = state.ranking;
  return (
    <p className={styles.line}>
      {mine ? (
        <>
          <strong>Seu melhor:</strong> #{mine.rank} · {formatPoints(mine.points)} pts ·{' '}
          {formatDuration(mine.durationMs)}
        </>
      ) : (
        `Você nunca jogou ${describeSetup(setup)}`
      )}
    </p>
  );
}
