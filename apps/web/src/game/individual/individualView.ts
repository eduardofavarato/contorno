import {
  challengeFor,
  currentIndividualCountryId,
  resolvePool,
  type CountryId,
  type GameSetup,
  type IndividualState,
} from '@contorno/core';
import type { MapFocus } from '../../map/focus';
import type { MapTone } from '../../map/WorldMap';

export interface MapView {
  readonly tones: ReadonlyMap<CountryId, MapTone>;
  readonly focus: MapFocus;
}

/** A tone shown for a moment on top of the regular ones, e.g. the red blink of a wrong guess. */
export interface Flash {
  readonly countryId: CountryId;
  readonly tone: MapTone;
}

const WORLD: MapFocus = { kind: 'world' };

/**
 * What the map shows for a game in progress.
 * Typing games light up the question's country; locating games hide it until it is settled.
 */
export function individualMapView(state: IndividualState, setup: GameSetup, flash: Flash | null): MapView {
  const tones = new Map<CountryId, MapTone>();
  for (const result of state.results) tones.set(result.countryId, result.outcome === 'correct' ? 'correct' : 'wrong');

  const challenge = challengeFor(setup.mode);
  let focus = WORLD;

  if (state.status !== 'finished') {
    const current = currentIndividualCountryId(state);
    const gaveUp = state.status === 'resolved' && state.results.at(-1)?.outcome === 'gave_up';

    if (challenge === 'type') {
      if (state.status === 'asking') tones.set(current, 'target');
      focus =
        setup.pool.kind === 'continent'
          ? { kind: 'countries', ids: resolvePool(setup.pool).map((country) => country.id) }
          : { kind: 'country', id: current };
    } else if (state.status === 'resolved') {
      // Locating: the answer is revealed in gold when the player gives up, and zoomed to once settled.
      if (gaveUp) tones.set(current, 'target');
      focus = { kind: 'country', id: current };
    }
  }

  if (flash) tones.set(flash.countryId, flash.tone);
  return { tones, focus };
}
