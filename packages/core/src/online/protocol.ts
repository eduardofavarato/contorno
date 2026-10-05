import { z } from 'zod';
import { CONTINENT_IDS } from '../countries/continents';
import type { Guess } from '../countries/guess';
import type { DuelResolution, DuelResult, PlayerIndex } from '../duel/duel';
import type { DuelView } from '../duel/view';
import type { GameSetup } from '../modes';

/** Longest typed answer accepted; the longest country alias is far shorter. */
export const MAX_ANSWER_LENGTH = 80;
export const ROOM_CODE_LENGTH = 4;
/** No 0/O/1/I: codes are read aloud and typed on phones. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const countryId = z.number().int().positive();
const player = z.union([z.literal(0), z.literal(1)]);
const points = z.number().int().nonnegative();

const guessSchema: z.ZodType<Guess> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), value: z.string().max(MAX_ANSWER_LENGTH) }),
  z.strictObject({ type: z.literal('country'), id: countryId }),
]);

const levelPool = z.strictObject({
  kind: z.literal('level'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
const continentPool = z.strictObject({ kind: z.literal('continent'), continent: z.enum(CONTINENT_IDS) });

const setupSchema: z.ZodType<GameSetup> = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('perguntas'), pool: levelPool }),
  z.strictObject({ mode: z.literal('continentes'), pool: continentPool }),
  z.strictObject({ mode: z.literal('localizar'), pool: levelPool }),
]);

/** Room codes are case-insensitive for the player; the server normalizes them to upper case. */
const roomCode = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .transform((code) => code.toUpperCase())
  .pipe(z.string().regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`)));

export type ClientMessage =
  | { readonly type: 'create'; readonly setup: GameSetup }
  | { readonly type: 'join'; readonly room: string }
  | { readonly type: 'guess'; readonly guess: Guess }
  | { readonly type: 'give_up' };

const clientMessageSchema: z.ZodType<ClientMessage> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('create'), setup: setupSchema }),
  z.strictObject({ type: z.literal('join'), room: roomCode }),
  z.strictObject({ type: z.literal('guess'), guess: guessSchema }),
  z.strictObject({ type: z.literal('give_up') }),
]);

export type ErrorCode = 'room_not_found' | 'room_full' | 'server_busy' | 'invalid_message';

export type ServerMessage =
  /** Sent to a player once seated; `player` says whether they are A (0) or B (1). */
  | { readonly type: 'room'; readonly code: string; readonly player: PlayerIndex; readonly setup: GameSetup }
  | { readonly type: 'opponent_joined' }
  | { readonly type: 'state'; readonly view: DuelView }
  | { readonly type: 'opponent_left' }
  | { readonly type: 'error'; readonly code: ErrorCode };

const resolutionSchema: z.ZodType<DuelResolution> = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('scored'), player, points, stolen: z.boolean() }),
  z.strictObject({ kind: z.literal('primary_failed'), gaveUp: z.boolean() }),
  z.strictObject({ kind: z.literal('nobody_scored') }),
  z.strictObject({ kind: z.literal('tiebreak_first_answered'), correct: z.boolean() }),
  z.strictObject({ kind: z.literal('tiebreak_replay'), bothCorrect: z.boolean() }),
  z.strictObject({ kind: z.literal('tiebreak_decided'), winner: player }),
]);

const resultSchema: z.ZodType<DuelResult> = z.strictObject({
  countryId,
  player: player.nullable(),
  points,
  stolen: z.boolean(),
});

const viewSchema: z.ZodType<DuelView> = z.strictObject({
  stage: z.enum(['primary', 'steal', 'tiebreak-first', 'tiebreak-second']),
  status: z.enum(['asking', 'resolved', 'finished']),
  resolution: resolutionSchema.nullable(),
  round: z.number().int().nonnegative(),
  questionCount: z.number().int().positive(),
  tiebreakRound: z.number().int().nonnegative(),
  scores: z.tuple([points, points]),
  results: z.array(resultSchema),
  winner: player.nullable(),
  countryId: countryId.nullable(),
  activePlayer: player,
  canGiveUp: z.boolean(),
  points,
});

const serverMessageSchema: z.ZodType<ServerMessage> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('room'), code: z.string(), player, setup: setupSchema }),
  z.strictObject({ type: z.literal('opponent_joined') }),
  z.strictObject({ type: z.literal('state'), view: viewSchema }),
  z.strictObject({ type: z.literal('opponent_left') }),
  z.strictObject({
    type: z.literal('error'),
    code: z.enum(['room_not_found', 'room_full', 'server_busy', 'invalid_message']),
  }),
]);

function decode<T>(schema: z.ZodType<T>, raw: string): T | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}

/** Parses and validates a message from a client; malformed input yields `null` and must simply be dropped. */
export function decodeClientMessage(raw: string): ClientMessage | null {
  return decode(clientMessageSchema, raw);
}

/** Parses and validates a message from the server. */
export function decodeServerMessage(raw: string): ServerMessage | null {
  return decode(serverMessageSchema, raw);
}

export function encodeMessage(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}
