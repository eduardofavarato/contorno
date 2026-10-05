import {
  index,
  int,
  json,
  mysqlTable,
  serial,
  uniqueIndex,
  varchar,
  datetime,
  bigint,
  char,
} from 'drizzle-orm/mysql-core';
import type { GameSetup } from '@contorno/core';

const timestamp = (name: string) => datetime(name, { mode: 'date', fsp: 3 });
const userId = () => bigint('user_id', { mode: 'number', unsigned: true });

export const users = mysqlTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 40 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    /** BCrypt hash; `null` for accounts that sign in with Google. */
    passwordHash: varchar('password_hash', { length: 72 }),
    /** Google's stable account id; `null` for password accounts. */
    googleSub: varchar('google_sub', { length: 64 }),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [uniqueIndex('users_email_uq').on(table.email), uniqueIndex('users_google_sub_uq').on(table.googleSub)],
);

/** Opaque refresh tokens, stored only as SHA-256 hashes and replaced on every use. */
export const refreshTokens = mysqlTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    userId: userId()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    uniqueIndex('refresh_tokens_hash_uq').on(table.tokenHash),
    index('refresh_tokens_user_idx').on(table.userId),
  ],
);

/** A ranked solo game: opened when it starts (the server draws the questions) and closed when it is verified. */
export const gameSessions = mysqlTable(
  'game_sessions',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: userId()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    boardKey: varchar('board_key', { length: 64 }).notNull(),
    setup: json('setup').$type<GameSetup>().notNull(),
    questionIds: json('question_ids').$type<number[]>().notNull(),
    startedAt: timestamp('started_at').notNull(),
    finishedAt: timestamp('finished_at'),
  },
  (table) => [index('game_sessions_user_idx').on(table.userId)],
);

export const scores = mysqlTable(
  'scores',
  {
    id: serial('id').primaryKey(),
    userId: userId()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: char('session_id', { length: 36 })
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    boardKey: varchar('board_key', { length: 64 }).notNull(),
    points: int('points').notNull(),
    durationMs: int('duration_ms').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('scores_session_uq').on(table.sessionId),
    index('scores_board_idx').on(table.boardKey, table.points, table.durationMs),
    index('scores_user_idx').on(table.userId),
  ],
);
