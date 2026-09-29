import { DB, TIER1, TIER2, isCorrectAnswer } from '../../shared/countries.js';

export const MAX_PTS = 2000;
export const STEAL_PTS = 1000;
export const DUEL_QUESTIONS = 10;

export function countriesForLevel(level) {
  const ids = Object.keys(DB).map(Number);
  if (level === 1) return ids.filter(id => TIER1.has(id));
  if (level === 2) return ids.filter(id => TIER1.has(id) || TIER2.has(id));
  return ids;
}

export function shuffle(items, random = Math.random) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Authoritative state of one online duel: the server picks the countries, checks answers and keeps the score,
 * so neither client can cheat. Transport-agnostic: talks to players only through `broadcast`.
 */
export class DisputaGame {
  constructor({ level, broadcast, schedule, random = Math.random }) {
    this.level = level;
    this.broadcast = broadcast;
    this.schedule = schedule;
    this.random = random;
    this.phase = 'waiting';
  }

  get isRunning() {
    return this.phase === 'in_game';
  }

  start() {
    const full = shuffle(countriesForLevel(this.level), this.random);
    Object.assign(this, {
      phase: 'in_game',
      questions: full.slice(0, DUEL_QUESTIONS),
      tiebreakPool: full.slice(DUEL_QUESTIONS),
      tiebreakIdx: 0,
      idx: 0,
      scores: [0, 0],
      gamePhase: 'primary',
      primaryPlayer: 0,
      inTiebreaker: false,
      tiebreakACorrect: null,
      results: [],
    });
    this.sendQuestion();
  }

  /** Answers from the player whose turn it isn't, or after the question was settled, are ignored. */
  handle(playerIdx, message) {
    if (!this.isRunning || this.answered || playerIdx !== this.activePlayer()) return;
    if (message.type === 'answer') this.handleAnswer(message.value);
    if (message.type === 'give_up') this.handleGiveUp();
  }

  abandon() {
    if (this.isRunning) this.phase = 'abandoned';
  }

  activePlayer() {
    if (this.inTiebreaker) return this.gamePhase === 'tb-a' ? 0 : 1;
    if (this.gamePhase === 'steal') return 1 - this.primaryPlayer;
    return this.primaryPlayer;
  }

  currentCountry() {
    return this.inTiebreaker ? this.tiebreakPool[this.tiebreakIdx] : this.questions[this.idx];
  }

  later(fn, ms) {
    this.schedule(() => {
      if (this.isRunning) fn();
    }, ms);
  }

  sendQuestion() {
    this.answered = false;
    const activePlayer = this.activePlayer();
    let subLabel = `Pergunta ${this.idx + 1}/${DUEL_QUESTIONS}`;
    if (this.inTiebreaker) subLabel = 'Rodada de Fogo';
    else if (this.gamePhase === 'steal') subLabel = 'Roubo!';

    this.broadcast({
      type: 'question',
      countryId: this.currentCountry(),
      activePlayer,
      gamePhase: this.gamePhase,
      idx: this.idx,
      scores: [...this.scores],
      inTiebreaker: this.inTiebreaker,
      qPts: MAX_PTS,
      subLabel,
      results: this.results,
    });
  }

  handleAnswer(value) {
    const countryId = this.currentCountry();
    if (isCorrectAnswer(countryId, value)) this.onCorrect(countryId);
    else this.onWrong(countryId);
  }

  handleGiveUp() {
    if (this.gamePhase !== 'primary' || this.inTiebreaker) return;
    this.answered = true;
    this.broadcast({
      type: 'answer_result', correct: false, countryId: this.currentCountry(), primaryFailed: true, gaveUp: true,
      stealer: 1 - this.primaryPlayer, scores: [...this.scores],
    });
    this.later(() => this.enterSteal(), 2000);
  }

  onCorrect(countryId) {
    this.answered = true;
    if (this.inTiebreaker) {
      this.onTiebreakAnswer(countryId, true);
      return;
    }
    const stolen = this.gamePhase === 'steal';
    const pts = stolen ? STEAL_PTS : MAX_PTS;
    const scorer = stolen ? 1 - this.primaryPlayer : this.primaryPlayer;
    this.scores[scorer] += pts;
    const result = { id: countryId, country: DB[countryId].pt, pts, player: scorer, stolen };
    this.results.push(result);
    this.broadcast({ type: 'answer_result', correct: true, countryId, pts, scorer, stolen, scores: [...this.scores], result });
    this.later(() => this.advance(), 1600);
  }

  onWrong(countryId) {
    this.answered = true;
    if (this.inTiebreaker) {
      this.onTiebreakAnswer(countryId, false);
      return;
    }
    if (this.gamePhase === 'steal') {
      const result = { id: countryId, country: DB[countryId].pt, pts: 0, player: -1, stolen: false };
      this.results.push(result);
      this.broadcast({ type: 'answer_result', correct: false, countryId, stealFailed: true, scores: [...this.scores], result });
      this.later(() => this.advance(), 2000);
      return;
    }
    this.broadcast({
      type: 'answer_result', correct: false, countryId, primaryFailed: true,
      stealer: 1 - this.primaryPlayer, scores: [...this.scores],
    });
    this.later(() => this.enterSteal(), 2000);
  }

  /** Rodada de Fogo: both answer the same country; one right and one wrong decides the match. */
  onTiebreakAnswer(countryId, correct) {
    if (this.gamePhase === 'tb-a') {
      this.tiebreakACorrect = correct;
      this.broadcast({ type: 'tb_result', correct, phase: 'tb-a', countryId });
      this.later(() => this.switchTiebreakToB(countryId), 1500);
      return;
    }
    if (correct === this.tiebreakACorrect) {
      const result = correct ? undefined : { id: countryId, country: DB[countryId].pt, pts: 0, player: -1, stolen: false };
      if (result) this.results.push(result);
      this.broadcast({ type: 'tb_result', correct, phase: 'tb-b', bothCorrect: correct, bothMissed: !correct, countryId, result });
      this.later(() => this.nextTiebreak(), 2000);
      return;
    }
    this.broadcast({ type: 'tb_result', correct, phase: 'tb-b', winner: correct ? 1 : 0, countryId });
    this.later(() => this.end(correct ? 'B' : 'A'), 2000);
  }

  enterSteal() {
    this.gamePhase = 'steal';
    this.sendQuestion();
  }

  advance() {
    this.idx++;
    this.gamePhase = 'primary';
    this.primaryPlayer = this.idx % 2;
    if (this.idx < DUEL_QUESTIONS) {
      this.sendQuestion();
    } else if (this.scores[0] === this.scores[1]) {
      this.startTiebreak();
    } else {
      this.end();
    }
  }

  startTiebreak() {
    this.inTiebreaker = true;
    this.gamePhase = 'tb-a';
    this.tiebreakACorrect = null;
    if (this.tiebreakPool.length === 0) this.refillTiebreakPool();
    this.tiebreakIdx = 0;
    this.broadcast({ type: 'tiebreaker_start' });
    this.later(() => this.sendQuestion(), 800);
  }

  switchTiebreakToB(countryId) {
    this.gamePhase = 'tb-b';
    this.broadcast({ type: 'tb_switch', countryId });
    this.sendQuestion();
  }

  nextTiebreak() {
    this.tiebreakIdx++;
    if (this.tiebreakIdx >= this.tiebreakPool.length) this.refillTiebreakPool();
    this.gamePhase = 'tb-a';
    this.tiebreakACorrect = null;
    this.sendQuestion();
  }

  refillTiebreakPool() {
    const used = new Set(this.questions);
    this.tiebreakPool = shuffle(countriesForLevel(this.level).filter(id => !used.has(id)), this.random);
    this.tiebreakIdx = 0;
  }

  /** The Rodada de Fogo passes its winner explicitly: the score is still tied at that point. */
  end(tiebreakWinner) {
    this.phase = 'finished';
    const [a, b] = this.scores;
    const winner = tiebreakWinner ?? (a > b ? 'A' : 'B');
    this.broadcast({ type: 'game_over', winner, scores: [...this.scores] });
  }
}
