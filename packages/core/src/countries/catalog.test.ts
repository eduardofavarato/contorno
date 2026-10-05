import { describe, expect, it } from 'vitest';
import { countriesForContinent, countriesForLevel, findCountry, getCountry } from './catalog';
import { CONTINENTS } from './continents';
import { COUNTRIES } from './data';

describe('country data', () => {
  it('has unique ids', () => {
    expect(new Set(COUNTRIES.map((country) => country.id)).size).toBe(COUNTRIES.length);
  });

  it('gives every country at least one alias', () => {
    expect(COUNTRIES.filter((country) => country.aliases.length === 0)).toEqual([]);
  });
});

describe('levels', () => {
  it('are cumulative', () => {
    expect(countriesForLevel(1)).toHaveLength(50);
    expect(countriesForLevel(2)).toHaveLength(150);
    expect(countriesForLevel(3)).toHaveLength(COUNTRIES.length);
  });

  it('only add countries as they get harder', () => {
    const easy = new Set(countriesForLevel(1).map((country) => country.id));
    expect(countriesForLevel(2).filter((country) => easy.has(country.id))).toHaveLength(easy.size);
  });
});

describe('continents', () => {
  it('only reference known countries', () => {
    for (const continent of CONTINENTS) {
      for (const id of continent.countryIds) expect(findCountry(id), `${continent.id} -> ${String(id)}`).toBeDefined();
    }
  });

  it('do not overlap', () => {
    const ids = CONTINENTS.flatMap((continent) => continent.countryIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves the countries of a continent', () => {
    expect(countriesForContinent('oceania').map((country) => country.name)).toEqual([
      'Austrália',
      'Fiji',
      'Nova Zelândia',
      'Papua Nova Guiné',
    ]);
  });
});

describe('lookup', () => {
  it('finds a country by id', () => {
    expect(getCountry(76).name).toBe('Brasil');
  });

  it('throws for an unknown id on getCountry only', () => {
    expect(findCountry(-1)).toBeUndefined();
    expect(() => getCountry(-1)).toThrow('Unknown country id: -1');
  });
});
