import { COUNTRIES } from '@contorno/core';
import { describe, expect, it } from 'vitest';
import { createMapLayout } from './layout';
import { WORLD_SHAPES } from './world';

const FRANCE = 250;

describe('world data', () => {
  it('has a shape for every country the quiz can ask about', () => {
    const onMap = new Set(WORLD_SHAPES.map((shape) => shape.id));

    expect(COUNTRIES.filter((country) => !onMap.has(country.id)).map((country) => country.name)).toEqual([]);
  });
});

describe('createMapLayout', () => {
  const layout = createMapLayout({ width: 800, height: 400 });

  it('draws one path per shape', () => {
    expect(layout.countries).toHaveLength(WORLD_SHAPES.length);
    expect(layout.countries.every((country) => country.d.length > 0)).toBe(true);
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

  it('returns null for unknown countries', () => {
    expect(layout.mainlandBounds(-1)).toBeNull();
    expect(layout.boundsOf([-1])).toBeNull();
  });
});
