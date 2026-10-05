import { lazy, Suspense } from 'react';
import type { WorldMapProps } from './WorldMap';

// The map brings ~700 KB of geometry, so it is only fetched once a screen needs it.
const WorldMap = lazy(() => import('./WorldMap').then((module) => ({ default: module.WorldMap })));

export function LazyWorldMap(props: WorldMapProps) {
  return (
    <Suspense fallback={null}>
      <WorldMap {...props} />
    </Suspense>
  );
}
