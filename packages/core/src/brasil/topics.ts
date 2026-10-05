import type { Challenge } from '../quiz/question';

/** What the Especial Brasil mode asks about. */
export const BRASIL_TOPICS = ['estados', 'capitais', 'cidades'] as const;

export type BrasilTopic = (typeof BRASIL_TOPICS)[number];

/** States and capitals are typed (the state is highlighted); cities are located (the state is clicked). */
export function brasilChallenge(topic: BrasilTopic): Challenge {
  return topic === 'cidades' ? 'click' : 'type';
}
