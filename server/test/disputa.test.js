import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { DB, isCorrectAnswer } from '../../shared/countries.js';
import { DisputaGame, DUEL_QUESTIONS, MAX_PTS, STEAL_PTS } from '../src/disputa.js';

/** Runs the game with a manual clock: scheduled steps run only when the test calls `tick()`. */
function createGame(level = 1) {
  const messages = [];
  const pending = [];
  const game = new DisputaGame({
    level,
    broadcast: message => messages.push(message),
    schedule: fn => pending.push(fn),
    random: () => 0.42,
  });
  const tick = () => {
    while (pending.length) pending.shift()();
  };
  const last = type => messages.findLast(message => message.type === type);
  const answerFor = countryId => DB[countryId].a[0];
  return { game, messages, tick, last, answerFor };
}

describe('DisputaGame', () => {
  let t;

  beforeEach(() => {
    t = createGame();
    t.game.start();
  });

  it('asks player A first and scores a correct answer with the full points', () => {
    const question = t.last('question');
    assert.equal(question.activePlayer, 0);

    t.game.handle(0, { type: 'answer', value: t.answerFor(question.countryId) });

    const result = t.last('answer_result');
    assert.equal(result.correct, true);
    assert.equal(result.pts, MAX_PTS);
    assert.deepEqual(result.scores, [MAX_PTS, 0]);
  });

  it('alternates the primary player between questions', () => {
    t.game.handle(0, { type: 'answer', value: t.answerFor(t.last('question').countryId) });
    t.tick();

    assert.equal(t.last('question').activePlayer, 1);
    assert.equal(t.last('question').subLabel, `Pergunta 2/${DUEL_QUESTIONS}`);
  });

  it('ignores answers from the player whose turn it is not', () => {
    t.game.handle(1, { type: 'answer', value: t.answerFor(t.last('question').countryId) });

    assert.equal(t.last('answer_result'), undefined);
  });

  it('gives the opponent a steal worth fewer points after a wrong answer', () => {
    const countryId = t.last('question').countryId;
    t.game.handle(0, { type: 'answer', value: 'atlantida' });
    t.tick();

    const steal = t.last('question');
    assert.equal(steal.activePlayer, 1);
    assert.equal(steal.gamePhase, 'steal');

    t.game.handle(1, { type: 'answer', value: t.answerFor(countryId) });
    assert.deepEqual(t.last('answer_result').scores, [0, STEAL_PTS]);
  });

  it('turns giving up into a steal chance', () => {
    t.game.handle(0, { type: 'give_up' });
    t.tick();

    assert.equal(t.last('question').gamePhase, 'steal');
  });

  it('goes to the Rodada de Fogo on a tie and ends when only one player answers it right', () => {
    for (let i = 0; i < DUEL_QUESTIONS; i++) {
      const active = t.last('question').activePlayer;
      t.game.handle(active, { type: 'give_up' });
      t.tick();
      t.game.handle(1 - active, { type: 'answer', value: 'atlantida' });
      t.tick();
    }
    assert.ok(t.last('tiebreaker_start'));

    const countryId = t.last('question').countryId;
    t.game.handle(0, { type: 'answer', value: t.answerFor(countryId) });
    t.tick();
    t.game.handle(1, { type: 'answer', value: 'atlantida' });
    t.tick();

    assert.equal(t.last('game_over').winner, 'A');
  });

  it('stops reacting once abandoned', () => {
    t.game.abandon();
    t.game.handle(0, { type: 'answer', value: t.answerFor(t.last('question').countryId) });

    assert.equal(t.last('answer_result'), undefined);
  });
});

describe('shared country data', () => {
  it('accepts the same aliases online as offline (they used to diverge)', () => {
    assert.ok(isCorrectAnswer(384, 'Costa de Marfim'));
    assert.ok(isCorrectAnswer(408, 'norte coreia'));
    assert.ok(isCorrectAnswer(76, '  BRASÍL  '));
    assert.ok(!isCorrectAnswer(76, 'argentina'));
  });
});
