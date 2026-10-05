import { BRASIL_MAP } from './brasil';
import { MapView, type MapViewProps } from './MapView';

/** The map of Brazil's states; a module of its own so its geometry is only fetched when a game needs it. */
export function BrasilMapView(props: Omit<MapViewProps, 'data'>) {
  return <MapView data={BRASIL_MAP} {...props} />;
}
