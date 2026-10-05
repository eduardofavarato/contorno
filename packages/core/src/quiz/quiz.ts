import type { GameSetup } from '../modes';
import { challengeFor, mapFor } from '../modes';
import { brasilQuestions } from '../brasil/questions';
import { worldQuestions } from './world';
import type { Challenge, Question } from './question';

/** Which map the quiz is played on. */
export type MapKind = 'world' | 'brasil';

/** Everything a game of one setup is made of. */
export interface Quiz {
  readonly challenge: Challenge;
  readonly map: MapKind;
  /** Every question the setup can ask; a game plays all of them or a sample. */
  readonly questions: readonly Question[];
  /** How many a solo game asks; `null` plays them all (e.g. every country of a continent). */
  readonly soloCount: number | null;
}

const SAMPLE_SIZE = 10;

export function quizFor(setup: GameSetup): Quiz {
  const challenge = challengeFor(setup);
  if (setup.mode === 'brasil') {
    return { challenge, map: mapFor(setup), questions: brasilQuestions(setup.pool.topic), soloCount: SAMPLE_SIZE };
  }
  return {
    challenge,
    map: mapFor(setup),
    questions: worldQuestions(setup.pool, challenge),
    soloCount: setup.pool.kind === 'continent' ? null : SAMPLE_SIZE,
  };
}
