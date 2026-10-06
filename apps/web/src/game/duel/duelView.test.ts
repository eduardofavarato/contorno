import {
  duelReducer,
  startDuel,
  type DuelEvent,
  toDuelView,
  type DuelView,
  type GameSetup,
  type PlayerIndex,
} from '@contorno/core';
import { describe, expect, it } from 'vitest';
import { pickQuestions } from '../../test-utils';
import { duelFeedback, duelMapView, settledAnswer, stakesLabel, turnBanner } from './duelView';

const BRASIL = 76;
const ARGENTINA = 32;
const CHILE = 152;
const NAMES = ['Ana', 'Beto'] as const;

const TYPING = { challenge: 'type', repeatsRegions: false } as const;
const LOCATING = { challenge: 'click', repeatsRegions: false } as const;
/** Locating where a region can be asked again, like the cities of a state. */
const CITIES = { challenge: 'click', repeatsRegions: true } as const;

const perguntas: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };

const start = () =>
  startDuel({
    questions: pickQuestions(perguntas, [BRASIL, ARGENTINA]),
    tiebreakOrder: pickQuestions(perguntas, [CHILE]),
  });
function play(...events: DuelEvent[]): DuelView {
  return toDuelView(events.reduce(duelReducer, start()));
}

const say = (player: PlayerIndex, value: string): DuelEvent => ({
  type: 'guess',
  player,
  guess: { type: 'text', value },
});
const next: DuelEvent = { type: 'next' };
const right = (player: PlayerIndex) => say(player, 'brasil');
const wrong = (player: PlayerIndex) => say(player, 'peru');

/** Brasil by Ana, then Argentina by Beto: tied, so the Rodada de Fogo (Chile) starts. */
const tied = (): DuelEvent[] => [right(0), next, say(1, 'argentina'), next];

describe('duelMapView', () => {
  it('lights up the current country when typing and zooms to it', () => {
    const view = duelMapView(play(), TYPING, null);

    expect(view.tones.get(BRASIL)).toBe('target');
    expect(view.focus).toEqual({ kind: 'region', id: BRASIL });
  });

  it('paints settled questions: scored green, unanswered red', () => {
    const view = duelMapView(play(wrong(0), next, wrong(1), next), TYPING, null);

    expect(view.tones.get(BRASIL)).toBe('wrong');
    expect(view.tones.get(ARGENTINA)).toBe('target');
  });

  it('lights the country again for the steal after a miss', () => {
    expect(duelMapView(play(wrong(0)), TYPING, null).tones.get(BRASIL)).toBe('wrong');
    expect(duelMapView(play(wrong(0), next), TYPING, null).tones.get(BRASIL)).toBe('target');
  });

  it('hides the answer when locating, even after the first player missed', () => {
    const view = duelMapView(play(wrong(0)), LOCATING, null);

    expect(view.tones.has(BRASIL)).toBe(false);
    expect(view.focus).toEqual({ kind: 'world' });
  });

  it('reveals and zooms to the answer once nobody else has to find it', () => {
    const view = duelMapView(play(right(0)), LOCATING, null);

    expect(view.tones.get(BRASIL)).toBe('correct');
    expect(view.focus).toEqual({ kind: 'region', id: BRASIL });
  });

  it('keeps the answer hidden after the first Rodada de Fogo answer when locating', () => {
    const view = duelMapView(play(...tied(), say(0, 'chile')), LOCATING, null);

    expect(view.tones.has(CHILE)).toBe(false);
  });

  it('applies a flash on top', () => {
    expect(duelMapView(play(), LOCATING, { regionId: CHILE, tone: 'wrong' }).tones.get(CHILE)).toBe('wrong');
  });
});

describe('duelMapView where regions repeat', () => {
  it('shows a missed question in red only while its answer is on screen', () => {
    const missed = play(wrong(0), next, wrong(1));
    expect(duelMapView(missed, CITIES, null).tones.get(BRASIL)).toBe('wrong');

    const nextQuestion = play(wrong(0), next, wrong(1), next);
    expect(duelMapView(nextQuestion, CITIES, null).tones.has(BRASIL)).toBe(false);
  });

  it('keeps a scored region painted', () => {
    const view = duelMapView(play(right(0), next), CITIES, null);

    expect(view.tones.get(BRASIL)).toBe('correct');
  });

  it('still keeps misses painted where each region is asked once', () => {
    const view = duelMapView(play(wrong(0), next, wrong(1), next), LOCATING, null);

    expect(view.tones.get(BRASIL)).toBe('wrong');
  });
});

describe('turnBanner', () => {
  it('names the turn owner and the question', () => {
    expect(turnBanner(play(), NAMES)).toEqual({ player: 0, name: 'Ana', label: 'Pergunta 1/2' });
    expect(turnBanner(play(right(0), next), NAMES)).toEqual({ player: 1, name: 'Beto', label: 'Pergunta 2/2' });
  });

  it('flags the steal and the Rodada de Fogo', () => {
    expect(turnBanner(play(wrong(0), next), NAMES)).toEqual({ player: 1, name: '🔥 Beto', label: 'Roubo!' });
    expect(turnBanner(play(...tied()), NAMES)).toEqual({ player: 0, name: '🔥 Ana', label: 'Rodada de Fogo' });
  });
});

describe('stakesLabel', () => {
  it('shows the points at stake, or the tiebreak rule', () => {
    expect(stakesLabel(play())).toBe('Disponível: 2.000');
    expect(stakesLabel(play(wrong(0), next))).toBe('Disponível: 1.000');
    expect(stakesLabel(play(...tied()))).toBe('Quem acertar sozinho vence');
  });
});

describe('duelFeedback', () => {
  it('is empty while a question is open', () => {
    expect(duelFeedback(play(), NAMES)).toBeNull();
  });

  it('announces points and steals', () => {
    expect(duelFeedback(play(right(0)), NAMES)?.text).toBe('✓ Correto! +2.000 pts');
    expect(duelFeedback(play(wrong(0), next, right(1)), NAMES)?.text).toBe('✓ Roubo de Beto! +1.000 pts');
  });

  it('offers the steal after a miss or a give up', () => {
    expect(duelFeedback(play(wrong(0)), NAMES)?.text).toBe('✗ Incorreto! Beto pode roubar por 1.000 pts.');
    expect(duelFeedback(play({ type: 'give_up', player: 0 }), NAMES)?.text).toBe('Beto pode roubar por 1.000 pts!');
  });

  it('reveals the country when the steal fails too', () => {
    expect(duelFeedback(play(wrong(0), next, wrong(1)), NAMES)?.text).toBe(
      '✗ Incorreto. Era Brasil. Nenhum ponto nesta pergunta.',
    );
  });

  it('narrates the Rodada de Fogo', () => {
    const first = play(...tied(), say(0, 'chile'));
    expect(duelFeedback(first, NAMES)?.text).toBe('✓ Correto! Vez de Beto…');

    const decided = play(...tied(), say(0, 'chile'), next, say(1, 'peru'));
    expect(duelFeedback(decided, NAMES)?.text).toBe('🏆 Ana vence a Rodada de Fogo!');

    const bothMissed = play(...tied(), say(0, 'peru'), next, say(1, 'peru'));
    expect(duelFeedback(bothMissed, NAMES)?.text).toBe('✗ Ambos erraram! Era Chile. Nova Rodada de Fogo…');
  });
});

describe('settledAnswer', () => {
  it('shows nothing while the question is open', () => {
    expect(settledAnswer(play())).toBeNull();
  });

  it('reveals the country once nobody else has to answer it', () => {
    expect(settledAnswer(play(right(0)))).toEqual({ text: 'Brasil', tone: 'ok' });
    expect(settledAnswer(play(wrong(0), next, wrong(1)))).toEqual({ text: 'Brasil', tone: 'bad' });
  });

  it('keeps the country hidden while the rival still has to answer it', () => {
    expect(settledAnswer(play(wrong(0)))).toEqual({ text: '', tone: 'bad' });
    expect(settledAnswer(play(...tied(), say(0, 'chile')))).toEqual({ text: '', tone: 'ok' });
  });
});
