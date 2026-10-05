import rewind from '@mapbox/geojson-rewind';
import { geoMercator } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import raw from './brasil.json';
import type { MapData } from './mapData';

type BrasilTopology = Topology<{ states: GeometryCollection }>;

const topology = raw as unknown as BrasilTopology;
// IBGE winds rings the GeoJSON way (exterior counter-clockwise); d3-geo expects the opposite and would otherwise
// read every state as "the whole sphere except the state".
const collection = rewind(feature(topology, topology.objects.states), true);

/** The 27 states, with their IBGE codes as shape ids. */
export const BRASIL_MAP: MapData = {
  label: 'Mapa do Brasil',
  collection,
  shapes: collection.features.map((entry) => ({
    id: entry.id === undefined ? null : Number(entry.id),
    feature: entry,
  })),
  borders: mesh(topology, topology.objects.states, (a, b) => a !== b),
  projection: geoMercator,
  backdrop: 'plain',
};
