import type { RegionId } from '@contorno/core';
import { memo, useMemo } from 'react';
import type { RegionPath } from './layout';
import { cx } from '../ui/cx';
import styles from './MapView.module.css';

/** How a country is painted. */
export type MapTone = 'neutral' | 'target' | 'correct' | 'wrong';

interface RegionPathsProps {
  readonly countries: readonly RegionPath[];
  readonly tones: ReadonlyMap<RegionId, MapTone>;
}

/** Highlighted countries are drawn last so their border is not covered by neighbours. */
export const RegionPaths = memo(function RegionPaths({ countries, tones }: RegionPathsProps) {
  const ordered = useMemo(() => {
    const toneOf = (country: RegionPath): MapTone =>
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
          data-region-id={country.id ?? undefined}
        />
      ))}
    </g>
  );
});
