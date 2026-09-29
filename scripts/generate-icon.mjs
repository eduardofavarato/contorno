// Draws the app icon (Brazil's outline in the app's gold, on its dark background) from the game's own map data.
// Output: assets/*.svg; the PNGs for @capacitor/assets are rendered from them (see README).
import { readFileSync, writeFileSync } from 'node:fs';
import { geoMercator, geoPath } from 'd3';
import { feature } from 'topojson-client';

const BRAZIL = 76;
const BACKGROUND = '#0d1117';
const GOLD = '#f0c040';
const SIZE = 1024;

const topology = JSON.parse(readFileSync(new URL('../src/js/map-data.json', import.meta.url)));
const brazil = feature(topology, topology.objects.countries).features.find(country => Number(country.id) === BRAZIL);

function outline(margin, strokeWidth) {
  const projection = geoMercator().fitExtent([[margin, margin], [SIZE - margin, SIZE - margin]], brazil);
  const d = geoPath(projection).digits(1)(brazil);
  return `<path d="${d}" fill="none" stroke="${GOLD}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">${body}</svg>\n`;

// Adaptive icons crop to the inner ~66%, so the foreground keeps the outline well inside that safe zone.
writeFileSync('assets/icon-foreground.svg', svg(outline(300, 24)));
writeFileSync('assets/icon-background.svg', svg(`<rect width="${SIZE}" height="${SIZE}" fill="${BACKGROUND}"/>`));
writeFileSync('assets/icon-only.svg', svg(`<rect width="${SIZE}" height="${SIZE}" rx="200" fill="${BACKGROUND}"/>${outline(170, 34)}`));
console.log('assets/icon-{foreground,background,only}.svg written');
