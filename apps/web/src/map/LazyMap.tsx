import type { MapKind } from '@contorno/core';
import { lazy, Suspense } from 'react';
import type { MapViewProps } from './MapView';

// Each map brings its own geometry (the world's is ~700 KB), so it is only fetched once a screen needs it.
const WorldMapView = lazy(() => import('./WorldMapView').then((module) => ({ default: module.WorldMapView })));
const BrasilMapView = lazy(() => import('./BrasilMapView').then((module) => ({ default: module.BrasilMapView })));

type LazyMapProps = Omit<MapViewProps, 'data'> & { readonly map: MapKind };

export function LazyMap({ map, ...props }: LazyMapProps) {
  return (
    <Suspense fallback={null}>{map === 'brasil' ? <BrasilMapView {...props} /> : <WorldMapView {...props} />}</Suspense>
  );
}
