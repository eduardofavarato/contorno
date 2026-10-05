import { CONTINENTS, type Continent } from './continents';
import { COUNTRIES } from './data';
import type { Country, CountryId, Level } from './types';

const BY_ID: ReadonlyMap<CountryId, Country> = new Map(COUNTRIES.map((country) => [country.id, country]));

export function findCountry(id: CountryId): Country | undefined {
  return BY_ID.get(id);
}

export function getCountry(id: CountryId): Country {
  const country = BY_ID.get(id);
  if (!country) throw new Error(`Unknown country id: ${String(id)}`);
  return country;
}

/** Levels are cumulative: a harder level also includes every easier country. */
export function countriesForLevel(level: Level): readonly Country[] {
  return COUNTRIES.filter((country) => country.level <= level);
}

export function countriesForContinent(continent: Continent): readonly Country[] {
  const info = CONTINENTS.find((entry) => entry.id === continent);
  if (!info) throw new Error(`Unknown continent: ${continent}`);
  return info.countryIds.map(getCountry);
}
