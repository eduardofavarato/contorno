import { MAX_ATTEMPTS, type Challenge, type IndividualResult } from '@contorno/core';
import { formatPoints, plural } from '../../utils/format';

export interface Feedback {
  readonly text: string;
  readonly tone: 'ok' | 'bad';
}

const CORRECT_DELAY_MS = 1600;
const TYPE_MISS_DELAY_MS = 2000;
const CLICK_MISS_DELAY_MS = 2500;

function attemptsLeft(wrongs: number): string {
  return plural(MAX_ATTEMPTS - wrongs, 'tentativa restante', 'tentativas restantes');
}

/** Feedback for a wrong guess that still leaves attempts. */
export function wrongGuessFeedback(challenge: Challenge, wrongs: number): Feedback {
  const lead = challenge === 'type' ? '✗ Incorreto.' : '✗ Não é esse!';
  return { text: `${lead} ${attemptsLeft(wrongs)}.`, tone: 'bad' };
}

/** Compact "1 erro · 2 restantes" shown next to the available points; empty before the first mistake. */
export function wrongsLabel(wrongs: number): string {
  if (wrongs === 0) return '';
  return `${plural(wrongs, 'erro')} · ${plural(MAX_ATTEMPTS - wrongs, 'restante', 'restantes')}`;
}

/** Feedback once a question is settled. */
export function resolutionFeedback(result: IndividualResult, challenge: Challenge): Feedback {
  const name = result.question.answer;
  switch (result.outcome) {
    case 'correct': {
      const points = `✓ Correto! +${formatPoints(result.points)} pontos`;
      return { text: result.wrongs === 0 ? points : `${points} (${plural(result.wrongs, 'erro')})`, tone: 'ok' };
    }
    case 'failed':
      return { text: `✗ Era: ${name}. Tentativas esgotadas.`, tone: 'bad' };
    case 'gave_up':
      return { text: `${challenge === 'type' ? 'Era' : 'Revelado'}: ${name}. +0 pontos`, tone: 'bad' };
  }
}

/** How long the answer stays on screen before the next question. */
export function resolutionDelayMs(result: IndividualResult, challenge: Challenge): number {
  if (result.outcome === 'correct') return CORRECT_DELAY_MS;
  return challenge === 'type' ? TYPE_MISS_DELAY_MS : CLICK_MISS_DELAY_MS;
}
