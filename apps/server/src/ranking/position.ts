import { and, count, eq, gt, lt, or } from 'drizzle-orm';
import type { Db } from '../db/client';
import { scores } from '../db/schema';

/** Position on a board: 1 plus the games that beat this one (more points, or the same in less time, or earlier). */
export async function positionOf(
  db: Db,
  game: { boardKey: string; points: number; durationMs: number; id: number },
): Promise<number> {
  const [ahead] = await db
    .select({ total: count() })
    .from(scores)
    .where(
      and(
        eq(scores.boardKey, game.boardKey),
        or(
          gt(scores.points, game.points),
          and(eq(scores.points, game.points), lt(scores.durationMs, game.durationMs)),
          and(eq(scores.points, game.points), eq(scores.durationMs, game.durationMs), lt(scores.id, game.id)),
        ),
      ),
    );
  return (ahead?.total ?? 0) + 1;
}
