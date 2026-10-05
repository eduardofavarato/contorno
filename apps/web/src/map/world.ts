import { geoNaturalEarth1 } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { MapData } from './mapData';
import raw from './world.json';

type WorldTopology = Topology<{ countries: GeometryCollection }>;

const topology = raw as unknown as WorldTopology;
const collection = feature(topology, topology.objects.countries);

export const WORLD_MAP: MapData = {
  label: 'Mapa-múndi',
  collection,
  shapes: collection.features.map((entry) => ({
    id: entry.id === undefined ? null : Number(entry.id),
    feature: entry,
  })),
  borders: mesh(topology, topology.objects.countries, (a, b) => a !== b),
  projection: geoNaturalEarth1,
  backdrop: 'globe',
};
