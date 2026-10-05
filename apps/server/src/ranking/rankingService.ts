import { setupForBoard, type RankingEntry, type RankingResponse } from '@contorno/core';
import { asc, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { scores, users } from '../db/schema';
import { ApiException } from '../http/errors';
import { positionOf } from './position';

export const DEFAULT_RANKING_LIMIT = 50;
export const MAX_RANKING_LIMIT = 100;

interface Row {
  readonly id: number;
  readonly userId: number;
  readonly name: string;
  readonly points: number;
  readonly durationMs: number;
  readonly createdAt: Date;
}

/** Best first: more points, then less time, then whoever got there first. */
const BEST_FIRST = [desc(scores.points), asc(scores.durationMs), asc(scores.id)] as const;

const toEntry = (row: Row, rank: number): RankingEntry => ({
  rank,
  userId: row.userId,
  name: row.name,
  points: row.points,
  durationMs: row.durationMs,
  finishedAt: row.createdAt.toISOString(),
});

export class RankingService {
  constructor(private readonly db: Db) {}

  async board(boardKey: string, limit: number, userId: number | null): Promise<RankingResponse> {
    if (!setupForBoard(boardKey)) throw new ApiException('INVALID_REQUEST', 400, 'Ranking desconhecido.');

    const rows = await this.select(boardKey)
      .orderBy(...BEST_FIRST)
      .limit(limit);
    const entries = rows.map((row, index) => toEntry(row, index + 1));
    return { entries, mine: userId === null ? null : await this.bestOf(boardKey, userId, entries) };
  }

  /** The player's best game with its position; reuses the listed entry when it is already in the top. */
  private async bestOf(
    boardKey: string,
    userId: number,
    listed: readonly RankingEntry[],
  ): Promise<RankingEntry | null> {
    const inList = listed.find((entry) => entry.userId === userId);
    if (inList) return inList;

    const [best] = await this.select(boardKey)
      .where(eq(scores.userId, userId))
      .orderBy(...BEST_FIRST)
      .limit(1);
    if (!best) return null;
    return toEntry(best, await positionOf(this.db, { ...best, boardKey }));
  }

  private select(boardKey: string) {
    return this.db
      .select({
        id: scores.id,
        userId: scores.userId,
        name: users.name,
        points: scores.points,
        durationMs: scores.durationMs,
        createdAt: scores.createdAt,
      })
      .from(scores)
      .innerJoin(users, eq(users.id, scores.userId))
      .where(eq(scores.boardKey, boardKey))
      .$dynamic();
  }
}
