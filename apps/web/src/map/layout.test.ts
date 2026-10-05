import { BRASIL_STATES, COUNTRIES } from '@contorno/core';
import { geoArea } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import { BRASIL_MAP } from './brasil';
import { createMapLayout } from './layout';
import { WORLD_MAP } from './world';

const FRANCE = 250;
const SAO_PAULO = 35;

describe('map data', () => {
  it('has a shape for every country the quiz can ask about', () => {
    const onMap = new Set(WORLD_MAP.shapes.map((shape) => shape.id));

    expect(COUNTRIES.filter((country) => !onMap.has(country.id)).map((country) => country.name)).toEqual([]);
  });

  it('has a shape for every Brazilian state, and nothing else', () => {
    const onMap = BRASIL_MAP.shapes.map((shape) => shape.id).sort();

    expect(onMap).toEqual(BRASIL_STATES.map((state) => state.code).sort());
  });
});

describe('createMapLayout (world)', () => {
  const layout = createMapLayout({ width: 800, height: 400 }, WORLD_MAP);

  it('draws one path per shape, behind a sphere and graticule', () => {
    expect(layout.countries).toHaveLength(WORLD_MAP.shapes.length);
    expect(layout.countries.every((country) => country.d.length > 0)).toBe(true);
    expect(layout.spherePath).not.toBe('');
    expect(layout.graticulePath).not.toBe('');
  });

  it('gives every shape a unique key', () => {
    expect(new Set(layout.countries.map((country) => country.key)).size).toBe(layout.countries.length);
  });

  it('keeps the projection inside the requested box', () => {
    const world = layout.boundsOf(COUNTRIES.map((country) => country.id));

    expect(world?.x0).toBeGreaterThanOrEqual(0);
    expect(world?.x1).toBeLessThanOrEqual(800);
    expect(world?.y1).toBeLessThanOrEqual(400);
  });

  it('measures a country by its mainland, not by its overseas territories', () => {
    const mainland = layout.mainlandBounds(FRANCE);
    const whole = layout.boundsOf([FRANCE]);

    expect(mainland).not.toBeNull();
    expect(whole).not.toBeNull();
    expect((mainland?.x1 ?? 0) - (mainland?.x0 ?? 0)).toBeLessThan((whole?.x1 ?? 0) - (whole?.x0 ?? 0));
  });

  it('returns null for unknown regions', () => {
    expect(layout.mainlandBounds(-1)).toBeNull();
    expect(layout.boundsOf([-1])).toBeNull();
  });
});

describe('createMapLayout (Brasil)', () => {
  const layout = createMapLayout({ width: 800, height: 600 }, BRASIL_MAP);

  it('draws the states without a sphere behind them', () => {
    expect(layout.countries).toHaveLength(27);
    expect(layout.spherePath).toBe('');
    expect(layout.graticulePath).toBe('');
  });

  it('fits all of Brazil in the box', () => {
    const brazil = layout.boundsOf(BRASIL_STATES.map((state) => state.code));

    expect(brazil?.x0).toBeGreaterThanOrEqual(0);
    expect(brazil?.x1).toBeLessThanOrEqual(800);
    expect(brazil?.y0).toBeGreaterThanOrEqual(0);
    expect(brazil?.y1).toBeLessThanOrEqual(600);
  });

  it('finds a state by its IBGE code', () => {
    const saoPaulo = layout.mainlandBounds(SAO_PAULO);

    expect(saoPaulo).not.toBeNull();
    expect(saoPaulo?.x1).toBeGreaterThan(saoPaulo?.x0 ?? Infinity);
  });
});

describe('Brazil shapes', () => {
  it('are wound the way d3 expects, so each state covers a small part of the sphere and not all of it', () => {
    for (const shape of BRASIL_MAP.shapes) {
      expect(geoArea(shape.feature), String(shape.id)).toBeLessThan(0.2);
    }
  });
});
