import type { CountryId } from '@contorno/core';
import { geoArea, geoGraticule, geoNaturalEarth1, geoPath, type GeoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { Geometry, Polygon } from 'geojson';
import { WORLD_BORDERS, WORLD_COLLECTION, WORLD_SHAPES } from './world';

export interface MapSize {
  readonly width: number;
  readonly height: number;
}

export interface Bounds {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface CountryPath {
  readonly id: CountryId | null;
  readonly key: string;
  readonly d: string;
}

export interface MapLayout {
  readonly size: MapSize;
  readonly spherePath: string;
  readonly graticulePath: string;
  readonly bordersPath: string;
  readonly countries: readonly CountryPath[];
  /** Bounds of the country's largest landmass, or `null` for an unknown id. */
  mainlandBounds(id: CountryId): Bounds | null;
  /** Bounds enclosing every known country in `ids`, or `null` when none is known. */
  boundsOf(ids: readonly CountryId[]): Bounds | null;
}

const MARGIN = 10;

/** Projects the world into a `size` box; all coordinates are in the SVG's pixel space. */
export function createMapLayout(size: MapSize): MapLayout {
  const projection = geoNaturalEarth1().fitExtent(
    [
      [MARGIN, MARGIN],
      [size.width - MARGIN, size.height - MARGIN],
    ],
    WORLD_COLLECTION,
  );
  const path = geoPath(projection);
  const render = (object: GeoPermissibleObjects) => path(object) ?? '';

  return {
    size,
    spherePath: render({ type: 'Sphere' }),
    graticulePath: render(geoGraticule()()),
    bordersPath: render(WORLD_BORDERS),
    countries: WORLD_SHAPES.map((shape, index) => ({
      id: shape.id,
      // Some territories share a country's id (Ashmore and Cartier Is. is 036, like Australia), so the index disambiguates.
      key: `${shape.id === null ? 'territory' : String(shape.id)}-${String(index)}`,
      d: render(shape.feature),
    })),
    mainlandBounds: (id) => {
      const shape = WORLD_SHAPES.find((entry) => entry.id === id);
      return shape ? toBounds(path, largestLandmass(shape.feature.geometry)) : null;
    },
    boundsOf: (ids) => {
      const bounds = ids.flatMap((id) => {
        const shape = WORLD_SHAPES.find((entry) => entry.id === id);
        return shape ? [toBounds(path, shape.feature)] : [];
      });
      return bounds.length === 0 ? null : bounds.reduce(union);
    },
  };
}

/**
 * A country's full box can span oceans (France includes the Caribbean and the Indian Ocean),
 * so zooming to a country targets its biggest polygon instead.
 */
function largestLandmass(geometry: Geometry): GeoPermissibleObjects {
  if (geometry.type !== 'MultiPolygon') return geometry;
  const polygons = geometry.coordinates.map((coordinates): Polygon => ({ type: 'Polygon', coordinates }));
  return polygons.reduce((best, polygon) => (geoArea(polygon) > geoArea(best) ? polygon : best));
}

function toBounds(path: GeoPath, object: GeoPermissibleObjects): Bounds {
  const [[x0, y0], [x1, y1]] = path.bounds(object);
  return { x0, y0, x1, y1 };
}

function union(a: Bounds, b: Bounds): Bounds {
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}
