// Generates src/map/brasil.json: the states of Brazil (IBGE's official mesh) as a compact TopoJSON whose shape ids are
// the IBGE state codes. The rings keep IBGE's RFC 7946 winding; src/map/brasil.ts rewinds them for d3. Run: node scripts/generate-brasil-map.mjs
import { writeFileSync } from 'node:fs';
import { topology } from 'topojson-server';

const URL_ =
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=UF';
const OUT = new URL('../src/map/brasil.json', import.meta.url);
// Coordinates snap to a 1e5 grid (about 1 km at this scale), which shrinks the file without visible change.
const QUANTIZATION = 1e5;

const response = await fetch(URL_);
if (!response.ok) throw new Error(`IBGE answered ${response.status}`);
const collection = await response.json();

const states = {
  type: 'FeatureCollection',
  features: collection.features.map((feature) => ({
    type: 'Feature',
    id: feature.properties.codarea,
    properties: {},
    geometry: feature.geometry,
  })),
};
if (states.features.length !== 27) throw new Error(`Expected 27 states, got ${states.features.length}`);

writeFileSync(OUT, JSON.stringify(topology({ states }, QUANTIZATION)));
console.log(`27 states -> ${OUT.pathname}`);
