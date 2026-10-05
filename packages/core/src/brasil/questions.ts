import type { Question } from '../quiz/question';
import { BRASIL_CITIES, BRASIL_STATES } from './data';
import type { BrasilTopic } from './topics';

const stateByCode = new Map(BRASIL_STATES.map((state) => [state.code, state]));

/** Every question of a topic: 27 states, 27 capitals, or 78 cities (the Distrito Federal has none besides its capital). */
export function brasilQuestions(topic: BrasilTopic): readonly Question[] {
  switch (topic) {
    case 'estados':
      return BRASIL_STATES.map((state) => ({
        id: state.code,
        regionId: state.code,
        prompt: null,
        subject: state.name,
        answer: state.name,
        challenge: 'type',
        // The abbreviation is as common as the name ("SP", "RJ").
        accepts: [state.name, state.abbr],
      }));
    case 'capitais':
      return BRASIL_STATES.map((state) => ({
        id: state.code,
        regionId: state.code,
        prompt: null,
        subject: state.name,
        answer: state.capital,
        challenge: 'type',
        accepts: [state.capital, ...state.capitalAliases],
      }));
    case 'cidades':
      return BRASIL_CITIES.map((city) => {
        const state = stateByCode.get(city.stateCode);
        if (!state) throw new Error(`City ${city.name} belongs to an unknown state`);
        return {
          id: city.id,
          regionId: state.code,
          prompt: city.name,
          subject: city.name,
          answer: state.name,
          challenge: 'click',
          accepts: [],
        };
      });
  }
}
