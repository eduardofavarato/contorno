import { normalize } from '../text/normalize';

/** Identifies a question within its quiz. */
export type QuestionId = number;

/** Identifies a shape on the quiz's map: an ISO country code, or an IBGE state code for the Brazil map. */
export type RegionId = number;

/** How the player answers: typing the answer, or clicking a region on the map. */
export type Challenge = 'type' | 'click';

/** A player's attempt: a typed answer, or the region they clicked. */
export type Guess =
  { readonly type: 'text'; readonly value: string } | { readonly type: 'region'; readonly id: RegionId };

/** What may be shown while a question is open. */
export interface QuestionPrompt {
  readonly id: QuestionId;
  /** The region that lights up (typing) or must be clicked (locating). */
  readonly regionId: RegionId;
  /** Text the player is asked about (e.g. the city to locate); `null` when the map itself is the question. */
  readonly prompt: string | null;
}

/** A question once it has been settled, so its subject and answer can be shown. */
export interface QuestionInfo extends QuestionPrompt {
  /** What the question was about, e.g. the country, the state whose capital was asked, or the city to locate. */
  readonly subject: string;
  /** The correct answer as shown to the player. */
  readonly answer: string;
}

export interface Question extends QuestionInfo {
  readonly challenge: Challenge;
  /** Typed answers that count as correct; compared after `normalize`. Empty when the player clicks. */
  readonly accepts: readonly string[];
}

export function toQuestionPrompt({ id, regionId, prompt }: Question): QuestionPrompt {
  return { id, regionId, prompt };
}

export function toQuestionInfo({ id, regionId, prompt, subject, answer }: Question): QuestionInfo {
  return { id, regionId, prompt, subject, answer };
}

/** Whether a typed answer matches any of the accepted ones, ignoring case, accents and punctuation. */
export function matchesAnswer(accepts: readonly string[], typed: string): boolean {
  const wanted = normalize(typed);
  return accepts.some((accepted) => normalize(accepted) === wanted);
}

/** A guess only counts in the way the question asks for: typing never answers a locating question, and vice versa. */
export function isCorrectGuess(question: Question, guess: Guess): boolean {
  if (guess.type === 'text') return question.challenge === 'type' && matchesAnswer(question.accepts, guess.value);
  return question.challenge === 'click' && guess.id === question.regionId;
}
