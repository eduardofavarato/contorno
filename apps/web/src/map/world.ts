import type { CountryId } from '@contorno/core';
import type { Feature, FeatureCollection, MultiLineString } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import raw from './world.json';

type WorldTopology = Topology<{ countries: GeometryCollection }>;

const topology = raw as unknown as WorldTopology;

export interface WorldShape {
  /** `null` for territories the quiz does not ask about (e.g. Somaliland). */
  readonly id: CountryId | null;
  readonly feature: Feature;
}

const collection: FeatureCollection = feature(topology, topology.objects.countries);

export const WORLD_COLLECTION = collection;

export const WORLD_SHAPES: readonly WorldShape[] = collection.features.map((entry) => ({
  id: entry.id === undefined ? null : Number(entry.id),
  feature: entry,
}));

/** Interior borders only, so a shared border is drawn once. */
export const WORLD_BORDERS: MultiLineString = mesh(topology, topology.objects.countries, (a, b) => a !== b);
