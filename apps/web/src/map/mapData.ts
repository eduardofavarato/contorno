import type { RegionId } from '@contorno/core';
import type { GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, MultiLineString } from 'geojson';

export interface MapShape {
  /** `null` for territories the quiz does not ask about (e.g. Somaliland). */
  readonly id: RegionId | null;
  readonly feature: Feature;
}

/** A map the quiz can be played on: its shapes, how they are projected and how they are drawn. */
export interface MapData {
  /** Accessible name of the drawing. */
  readonly label: string;
  readonly shapes: readonly MapShape[];
  readonly collection: FeatureCollection;
  /** Interior borders only, so a shared border is drawn once. */
  readonly borders: MultiLineString;
  readonly projection: () => GeoProjection;
  /** `globe` also draws the sphere and graticule behind the shapes; `plain` shows the shapes alone. */
  readonly backdrop: 'globe' | 'plain';
}
