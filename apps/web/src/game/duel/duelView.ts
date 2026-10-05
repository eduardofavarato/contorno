import {
  challengeFor,
  getCountry,
  STEAL_POINTS,
  type CountryId,
  type DuelResolution,
  type DuelView,
  type GameSetup,
  type PlayerIndex,
} from '@contorno/core';
import type { MapFocus } from '../../map/focus';
import type { MapTone } from '../../map/WorldMap';
import { formatPoints } from '../../utils/format';
import type { Flash, MapView } from '../individual/individualView';
import type { Feedback } from '../individual/messages';

type PlayerNames = readonly [string, string];

const WORLD: MapFocus = { kind: 'world' };

/** Name of the country being asked; only meaningful while the duel is running. */
export function currentName(view: DuelView): string {
  if (view.countryId === null) throw new Error('The duel has no current country');
  return getCountry(view.countryId).name;
}

function rival(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

/**
 * Whether the answer may be shown once `resolution` is on screen. After a miss on the player's own turn, or after the
 * first answer of the Rodada de Fogo, someone is still about to answer the same country, so it stays hidden.
 */
export function revealsAnswer(resolution: DuelResolution): boolean {
  return resolution.kind !== 'primary_failed' && resolution.kind !== 'tiebreak_first_answered';
}

/** How the settled question looks to the player: right (green) or wrong (red); `null` while it is still pending. */
function resolutionTone(resolution: DuelResolution): MapTone | null {
  switch (resolution.kind) {
    case 'scored':
      return 'correct';
    case 'nobody_scored':
    case 'primary_failed':
      return 'wrong';
    case 'tiebreak_first_answered':
      return null;
    case 'tiebreak_replay':
      return resolution.bothCorrect ? 'correct' : 'wrong';
    case 'tiebreak_decided':
      // The second player's answer is what decided it: right if they won, wrong otherwise.
      return resolution.winner === 1 ? 'correct' : 'wrong';
  }
}

/**
 * What the map shows. Typing duels light up the question's country; locating duels hide it
 * until nobody else has to find it, so a steal is not handed the answer.
 */
export function duelMapView(view: DuelView, setup: GameSetup, flash: Flash | null): MapView {
  const tones = new Map<CountryId, MapTone>();
  for (const result of view.results) tones.set(result.countryId, result.player === null ? 'wrong' : 'correct');

  const challenge = challengeFor(setup.mode);
  let focus = WORLD;

  if (view.countryId !== null) {
    const current = view.countryId;
    const resolution = view.resolution;

    if (challenge === 'type') {
      tones.set(current, (resolution && resolutionTone(resolution)) ?? 'target');
      focus = { kind: 'country', id: current };
    } else if (resolution && revealsAnswer(resolution)) {
      const tone = resolutionTone(resolution);
      if (tone) tones.set(current, tone);
      focus = { kind: 'country', id: current };
    }
  }

  if (flash) tones.set(flash.countryId, flash.tone);
  return { tones, focus };
}

export interface TurnBanner {
  readonly player: PlayerIndex;
  readonly name: string;
  readonly label: string;
}

/** Whose turn it is, and in which round. */
export function turnBanner(view: DuelView, names: PlayerNames): TurnBanner {
  const player = view.activePlayer;
  const name = names[player];
  switch (view.stage) {
    case 'primary':
      return { player, name, label: `Pergunta ${String(view.round + 1)}/${String(view.questionCount)}` };
    case 'steal':
      return { player, name: `🔥 ${name}`, label: 'Roubo!' };
    case 'tiebreak-first':
    case 'tiebreak-second':
      return { player, name: `🔥 ${name}`, label: 'Rodada de Fogo' };
  }
}

/** The line next to the banner: points at stake, or the rule of the Rodada de Fogo. */
export function stakesLabel(view: DuelView): string {
  if (view.stage === 'tiebreak-first' || view.stage === 'tiebreak-second') return 'Quem acertar sozinho vence';
  return `Disponível: ${formatPoints(view.points)}`;
}

/** Feedback for the question that just resolved; `null` while a question is open. */
export function duelFeedback(view: DuelView, names: PlayerNames): Feedback | null {
  const resolution = view.resolution;
  if (!resolution) return null;
  const turnOwner = view.activePlayer;
  const answer = currentName(view);

  switch (resolution.kind) {
    case 'scored':
      return {
        text: resolution.stolen
          ? `✓ Roubo de ${names[resolution.player]}! +${formatPoints(resolution.points)} pts`
          : `✓ Correto! +${formatPoints(resolution.points)} pts`,
        tone: 'ok',
      };
    case 'primary_failed': {
      const stealer = names[rival(turnOwner)];
      const text = `${stealer} pode roubar por ${formatPoints(STEAL_POINTS)} pts`;
      return { text: resolution.gaveUp ? `${text}!` : `✗ Incorreto! ${text}.`, tone: 'bad' };
    }
    case 'nobody_scored':
      return { text: `✗ Incorreto. Era ${answer}. Nenhum ponto nesta pergunta.`, tone: 'bad' };
    case 'tiebreak_first_answered':
      return {
        text: `${resolution.correct ? '✓ Correto!' : '✗ Incorreto!'} Vez de ${names[1]}…`,
        tone: resolution.correct ? 'ok' : 'bad',
      };
    case 'tiebreak_replay':
      return resolution.bothCorrect
        ? { text: '✓ Ambos acertaram! Nova Rodada de Fogo…', tone: 'ok' }
        : { text: `✗ Ambos erraram! Era ${answer}. Nova Rodada de Fogo…`, tone: 'bad' };
    case 'tiebreak_decided':
      return { text: `🏆 ${names[resolution.winner]} vence a Rodada de Fogo!`, tone: 'ok' };
  }
}

/** What the typed-answer field shows once resolved: the answer if it can be revealed, empty otherwise. */
export function settledAnswer(view: DuelView): { readonly text: string; readonly tone: 'ok' | 'bad' } | null {
  const resolution = view.resolution;
  if (!resolution) return null;
  const tone = resolutionTone(resolution) === 'correct' ? 'ok' : 'bad';
  if (resolution.kind === 'tiebreak_first_answered') return { text: '', tone: resolution.correct ? 'ok' : 'bad' };
  return { text: revealsAnswer(resolution) ? currentName(view) : '', tone };
}
