import { z } from 'zod';
import { BRASIL_TOPICS } from '../brasil/topics';
import { CONTINENT_IDS } from '../countries/continents';
import type { IndividualEvent } from '../individual/individual';
import type { GameSetup } from '../modes';
import type { Guess } from '../quiz/question';

/** Longest typed answer accepted; the longest country alias is far shorter. */
export const MAX_ANSWER_LENGTH = 80;

export const id = z.number().int().positive();

export const guessSchema: z.ZodType<Guess> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), value: z.string().max(MAX_ANSWER_LENGTH) }),
  z.strictObject({ type: z.literal('region'), id }),
]);

const levelPool = z.strictObject({
  kind: z.literal('level'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
const continentPool = z.strictObject({ kind: z.literal('continent'), continent: z.enum(CONTINENT_IDS) });
const brasilPool = z.strictObject({ kind: z.literal('brasil'), topic: z.enum(BRASIL_TOPICS) });

export const gameSetupSchema: z.ZodType<GameSetup> = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('perguntas'), pool: levelPool }),
  z.strictObject({ mode: z.literal('continentes'), pool: continentPool }),
  z.strictObject({ mode: z.literal('localizar'), pool: levelPool }),
  z.strictObject({ mode: z.literal('brasil'), pool: brasilPool }),
]);

export const individualEventSchema: z.ZodType<IndividualEvent> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('guess'), guess: guessSchema }),
  z.strictObject({ type: z.literal('give_up') }),
  z.strictObject({ type: z.literal('next') }),
]);
