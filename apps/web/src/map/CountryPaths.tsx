import type { CountryId } from '@contorno/core';
import { memo, useMemo } from 'react';
import type { CountryPath } from './layout';
import { cx } from '../ui/cx';
import styles from './WorldMap.module.css';

/** How a country is painted. */
export type MapTone = 'neutral' | 'target' | 'correct' | 'wrong';

interface CountryPathsProps {
  readonly countries: readonly CountryPath[];
  readonly tones: ReadonlyMap<CountryId, MapTone>;
}

/** Highlighted countries are drawn last so their border is not covered by neighbours. */
export const CountryPaths = memo(function CountryPaths({ countries, tones }: CountryPathsProps) {
  const ordered = useMemo(() => {
    const toneOf = (country: CountryPath): MapTone =>
      country.id === null ? 'neutral' : (tones.get(country.id) ?? 'neutral');
    const plain = countries.filter((country) => toneOf(country) === 'neutral');
    const highlighted = countries.filter((country) => toneOf(country) !== 'neutral');
    return [...plain, ...highlighted].map((country) => ({ country, tone: toneOf(country) }));
  }, [countries, tones]);

  return (
    <g>
      {ordered.map(({ country, tone }) => (
        <path
          key={country.key}
          d={country.d}
          className={cx(styles.country, styles[tone])}
          data-country-id={country.id ?? undefined}
        />
      ))}
    </g>
  );
});
