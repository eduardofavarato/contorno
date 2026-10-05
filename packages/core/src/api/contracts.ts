import { z } from 'zod';
import { gameSetupSchema, individualEventSchema } from './schemas';

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 40;
export const PASSWORD_MIN_LENGTH = 6;
/** BCrypt only reads the first 72 bytes of a password. */
export const PASSWORD_MAX_BYTES = 72;
/** More than any game can need: the longest has 39 questions of up to 3 guesses plus a settle and a next each. */
export const MAX_GAME_EVENTS = 400;

const name = z.string().trim().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH);
const email = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email())
  .transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    message: `At most ${String(PASSWORD_MAX_BYTES)} bytes`,
  });

export const signupRequestSchema = z.strictObject({ name, email, password });
export const loginRequestSchema = z.strictObject({ email, password: z.string().min(1).max(1024) });
export const googleLoginRequestSchema = z.strictObject({ idToken: z.string().min(10).max(8192) });

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;

export const userSchema = z.strictObject({ id: z.number().int().positive(), name: z.string() });
export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.strictObject({ accessToken: z.string(), user: userSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;

/** What the server offers: login and ranking only exist when it has a database configured. */
export const serverConfigSchema = z.strictObject({
  auth: z.strictObject({ enabled: z.boolean(), googleClientId: z.string().nullable() }),
});
export type ServerConfig = z.infer<typeof serverConfigSchema>;

export const startGameRequestSchema = z.strictObject({ setup: gameSetupSchema });
export const startGameResponseSchema = z.strictObject({
  gameId: z.uuid(),
  /** The questions to play, in order; the client rebuilds them from the shared catalog. */
  questionIds: z.array(z.number().int().positive()).min(1),
});
export type StartGameRequest = z.infer<typeof startGameRequestSchema>;
export type StartGameResponse = z.infer<typeof startGameResponseSchema>;

export const finishGameRequestSchema = z.strictObject({ events: z.array(individualEventSchema).max(MAX_GAME_EVENTS) });
export const finishGameResponseSchema = z.strictObject({
  points: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  /** Position on the board right after this game, 1 for the best. */
  rank: z.number().int().positive(),
});
export type FinishGameRequest = z.infer<typeof finishGameRequestSchema>;
export type FinishGameResponse = z.infer<typeof finishGameResponseSchema>;

export const rankingEntrySchema = z.strictObject({
  rank: z.number().int().positive(),
  userId: z.number().int().positive(),
  name: z.string(),
  points: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  finishedAt: z.iso.datetime(),
});
export const rankingResponseSchema = z.strictObject({
  entries: z.array(rankingEntrySchema),
  /** The signed-in player's best game on the board, with its position, even when outside `entries`. */
  mine: rankingEntrySchema.nullable(),
});
export type RankingEntry = z.infer<typeof rankingEntrySchema>;
export type RankingResponse = z.infer<typeof rankingResponseSchema>;

export const API_ERROR_CODES = [
  'INVALID_REQUEST',
  'UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'EMAIL_USES_GOOGLE',
  'EMAIL_USES_PASSWORD',
  'GOOGLE_TOKEN_INVALID',
  'GAME_NOT_FOUND',
  'GAME_ALREADY_FINISHED',
  'GAME_EXPIRED',
  'GAME_REJECTED',
  'RATE_LIMITED',
  'AUTH_DISABLED',
  'INTERNAL_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.strictObject({ code: z.enum(API_ERROR_CODES), message: z.string() });
export type ApiError = z.infer<typeof apiErrorSchema>;
