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
import { duelFeedback, duelMapView, settledAnswer, stakesLabel, turnBanner } from './duelView';

const BRASIL = 76;
const ARGENTINA = 32;
const CHILE = 152;
const NAMES = ['Ana', 'Beto'] as const;

const perguntas: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const localizar: GameSetup = { mode: 'localizar', pool: { kind: 'level', level: 1 } };

const start = () => startDuel({ questions: [BRASIL, ARGENTINA], tiebreakOrder: [CHILE] });
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
    const view = duelMapView(play(), perguntas, null);

    expect(view.tones.get(BRASIL)).toBe('target');
    expect(view.focus).toEqual({ kind: 'country', id: BRASIL });
  });

  it('paints settled questions: scored green, unanswered red', () => {
    const view = duelMapView(play(wrong(0), next, wrong(1), next), perguntas, null);

    expect(view.tones.get(BRASIL)).toBe('wrong');
    expect(view.tones.get(ARGENTINA)).toBe('target');
  });

  it('lights the country again for the steal after a miss', () => {
    expect(duelMapView(play(wrong(0)), perguntas, null).tones.get(BRASIL)).toBe('wrong');
    expect(duelMapView(play(wrong(0), next), perguntas, null).tones.get(BRASIL)).toBe('target');
  });

  it('hides the answer when locating, even after the first player missed', () => {
    const view = duelMapView(play(wrong(0)), localizar, null);

    expect(view.tones.has(BRASIL)).toBe(false);
    expect(view.focus).toEqual({ kind: 'world' });
  });

  it('reveals and zooms to the answer once nobody else has to find it', () => {
    const view = duelMapView(play(right(0)), localizar, null);

    expect(view.tones.get(BRASIL)).toBe('correct');
    expect(view.focus).toEqual({ kind: 'country', id: BRASIL });
  });

  it('keeps the answer hidden after the first Rodada de Fogo answer when locating', () => {
    const view = duelMapView(play(...tied(), say(0, 'chile')), localizar, null);

    expect(view.tones.has(CHILE)).toBe(false);
  });

  it('applies a flash on top', () => {
    expect(duelMapView(play(), localizar, { countryId: CHILE, tone: 'wrong' }).tones.get(CHILE)).toBe('wrong');
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
