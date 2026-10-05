import {
  boardKeyFor,
  questionsFor,
  quizFor,
  replayIndividual,
  selectIndividualQuestions,
  type FinishGameResponse,
  type GameSetup,
  type IndividualEvent,
  type Random,
  type StartGameResponse,
} from '@contorno/core';
import { and, count, eq, isNull, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Db } from '../db/client';
import { gameSessions, scores } from '../db/schema';
import { ApiException } from '../http/errors';
import { positionOf } from '../ranking/position';

/** A started game must be finished within this time, or it is forgotten. */
export const SESSION_TTL_MS = 30 * 60 * 1000;
/** Games a player may have open at once; a real person plays one at a time. */
export const MAX_OPEN_SESSIONS = 10;
/** No honest game is quicker: each answer already waits over a second on screen before the next question. */
export const MIN_MS_PER_QUESTION = 1000;

interface GameDeps {
  readonly db: Db;
  readonly random: Random;
  readonly now: () => Date;
}

const rejected = (message: string) => new ApiException('GAME_REJECTED', 422, message);

/**
 * Ranked solo games, checked by the server: it draws the questions and the start time, and later replays the
 * recorded moves with the same engine, so neither points nor time come from the client.
 */
export class GameService {
  constructor(private readonly deps: GameDeps) {}

  async start(userId: number, setup: GameSetup): Promise<StartGameResponse> {
    const { db, random, now } = this.deps;
    const startedAt = now();
    await db
      .delete(gameSessions)
      .where(
        and(
          eq(gameSessions.userId, userId),
          isNull(gameSessions.finishedAt),
          lt(gameSessions.startedAt, new Date(startedAt.getTime() - SESSION_TTL_MS)),
        ),
      );
    const [open] = await db
      .select({ total: count() })
      .from(gameSessions)
      .where(and(eq(gameSessions.userId, userId), isNull(gameSessions.finishedAt)));
    if ((open?.total ?? 0) >= MAX_OPEN_SESSIONS) {
      throw new ApiException('RATE_LIMITED', 429, 'Você tem partidas demais em andamento.');
    }

    const questionIds = selectIndividualQuestions(quizFor(setup), random).map((question) => question.id);
    const gameId = randomUUID();
    await db
      .insert(gameSessions)
      .values({ id: gameId, userId, boardKey: boardKeyFor(setup), setup, questionIds, startedAt });
    return { gameId, questionIds };
  }

  async finish(userId: number, gameId: string, events: readonly IndividualEvent[]): Promise<FinishGameResponse> {
    const { db, now } = this.deps;
    const finishedAt = now();

    const [session] = await db
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.id, gameId), eq(gameSessions.userId, userId)));
    if (!session) throw new ApiException('GAME_NOT_FOUND', 404, 'Partida não encontrada.');
    if (session.finishedAt !== null)
      throw new ApiException('GAME_ALREADY_FINISHED', 409, 'Esta partida já foi enviada.');

    const durationMs = finishedAt.getTime() - session.startedAt.getTime();
    if (durationMs > SESSION_TTL_MS) throw new ApiException('GAME_EXPIRED', 410, 'A partida expirou.');

    // Whatever happens next, the session is spent: a rejected game cannot be resubmitted with different moves.
    const [claimed] = await db
      .update(gameSessions)
      .set({ finishedAt })
      .where(and(eq(gameSessions.id, gameId), isNull(gameSessions.finishedAt)));
    if (claimed.affectedRows !== 1)
      throw new ApiException('GAME_ALREADY_FINISHED', 409, 'Esta partida já foi enviada.');

    const questions = questionsFor(session.setup, session.questionIds);
    if (!questions) throw rejected('Partida inválida.');
    const replay = replayIndividual(questions, events);
    if (!replay.ok) throw rejected('As jogadas não correspondem a uma partida completa.');
    if (durationMs < questions.length * MIN_MS_PER_QUESTION) throw rejected('Partida rápida demais.');

    const points = replay.state.score;
    const [inserted] = await db
      .insert(scores)
      .values({ userId, sessionId: gameId, boardKey: session.boardKey, points, durationMs, createdAt: finishedAt });
    const rank = await positionOf(db, { boardKey: session.boardKey, points, durationMs, id: inserted.insertId });
    return { points, durationMs, rank };
  }
}
