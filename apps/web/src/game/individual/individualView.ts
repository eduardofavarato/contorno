import { currentIndividualQuestion, type IndividualState, type Quiz, type RegionId } from '@contorno/core';
import type { MapFocus } from '../../map/focus';
import type { MapTone } from '../../map/MapView';

export interface MapView {
  readonly tones: ReadonlyMap<RegionId, MapTone>;
  readonly focus: MapFocus;
}

/** A tone shown for a moment on top of the regular ones, e.g. the red blink of a wrong guess. */
export interface Flash {
  readonly regionId: RegionId;
  readonly tone: MapTone;
}

const WHOLE_MAP: MapFocus = { kind: 'world' };

/**
 * What the map shows for a game in progress.
 * Typing games light up the question's region; locating games hide it until it is settled.
 */
export function individualMapView(state: IndividualState, quiz: Quiz, flash: Flash | null): MapView {
  const tones = new Map<RegionId, MapTone>();
  for (const { question, outcome } of state.results) {
    // Where a region can be asked again (several cities of one state), a miss must not stay painted: it would
    // mark that region as already dealt with. It shows red while the answer is on screen and then clears.
    if (outcome === 'correct') tones.set(question.regionId, 'correct');
    else if (!quiz.repeatsRegions) tones.set(question.regionId, 'wrong');
  }

  let focus = WHOLE_MAP;

  if (state.status !== 'finished') {
    const { regionId } = currentIndividualQuestion(state);
    const gaveUp = state.status === 'resolved' && state.results.at(-1)?.outcome === 'gave_up';

    if (quiz.challenge === 'type') {
      if (state.status === 'asking') tones.set(regionId, 'target');
      // A quiz that plays a whole continent frames all of it; otherwise the camera follows the question.
      focus =
        quiz.soloCount === null
          ? { kind: 'regions', ids: quiz.questions.map((question) => question.regionId) }
          : { kind: 'region', id: regionId };
    } else if (state.status === 'resolved') {
      // Locating: the answer is revealed in gold when the player gives up, and zoomed to once settled.
      if (gaveUp) tones.set(regionId, 'target');
      else if (state.results.at(-1)?.outcome === 'failed') tones.set(regionId, 'wrong');
      focus = { kind: 'region', id: regionId };
    }
  }

  if (flash) tones.set(flash.regionId, flash.tone);
  return { tones, focus };
}
