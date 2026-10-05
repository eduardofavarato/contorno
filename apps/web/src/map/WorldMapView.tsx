import { MapView, type MapViewProps } from './MapView';
import { WORLD_MAP } from './world';

/** The world map; a module of its own so its geometry is only fetched when a game needs it. */
export function WorldMapView(props: Omit<MapViewProps, 'data'>) {
  return <MapView data={WORLD_MAP} {...props} />;
}
