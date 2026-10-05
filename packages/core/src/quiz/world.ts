import { countriesForContinent, countriesForLevel } from '../countries/catalog';
import type { Country } from '../countries/types';
import type { ContinentPool, LevelPool } from '../pool/pool';
import type { Challenge, Question } from './question';

/** A country as a question: typing its name when highlighted, or finding it by name on the map. */
export function worldQuestion(country: Country, challenge: Challenge): Question {
  return {
    id: country.id,
    regionId: country.id,
    prompt: challenge === 'click' ? country.name : null,
    subject: country.name,
    answer: country.name,
    challenge,
    accepts: challenge === 'type' ? country.aliases : [],
  };
}

export function worldQuestions(pool: LevelPool | ContinentPool, challenge: Challenge): readonly Question[] {
  const countries = pool.kind === 'level' ? countriesForLevel(pool.level) : countriesForContinent(pool.continent);
  return countries.map((country) => worldQuestion(country, challenge));
}
