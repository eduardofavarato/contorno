import { describe, expect, it } from 'vitest';
import { focusKey, viewFor, WORLD_VIEW, type MapFocus } from './focus';
import type { Bounds, MapLayout } from './layout';

const size = { width: 800, height: 600 };

/** Layout stub where each country id maps to fixed bounds. */
function layoutWith(boundsById: Record<number, Bounds>): MapLayout {
  const lookup = (id: number) => boundsById[id] ?? null;
  return {
    size,
    spherePath: '',
    graticulePath: '',
    bordersPath: '',
    countries: [],
    mainlandBounds: lookup,
    boundsOf: (ids) => {
      const found = ids.flatMap((id) => lookup(id) ?? []);
      return found.length === 0
        ? null
        : {
            x0: Math.min(...found.map((b) => b.x0)),
            y0: Math.min(...found.map((b) => b.y0)),
            x1: Math.max(...found.map((b) => b.x1)),
            y1: Math.max(...found.map((b) => b.y1)),
          };
    },
  };
}

describe('viewFor', () => {
  it('frames the whole world with no pan or zoom', () => {
    expect(viewFor({ kind: 'world' }, layoutWith({}))).toBe(WORLD_VIEW);
  });

  it('centers a country and zooms to fit it with 10% padding', () => {
    const layout = layoutWith({ 1: { x0: 300, y0: 200, x1: 500, y1: 400 } });
    const view = viewFor({ kind: 'country', id: 1 }, layout);

    // padding = 10% of 600 = 60; k = min(800 / 320, 600 / 320) = 1.875
    expect(view?.k).toBeCloseTo(1.875);
    // The country's center (400, 300) must land on the map's center (400, 300).
    expect(400 * (view?.k ?? 0) + (view?.x ?? 0)).toBeCloseTo(400);
    expect(300 * (view?.k ?? 0) + (view?.y ?? 0)).toBeCloseTo(300);
  });

  it('leaves room around tiny countries instead of zooming all the way in', () => {
    const layout = layoutWith({ 1: { x0: 400, y0: 300, x1: 401, y1: 301 } });

    // Padding (60px each side) dominates: k = 600 / (1 + 120)
    expect(viewFor({ kind: 'country', id: 1 }, layout)?.k).toBeCloseTo(600 / 121);
  });

  it('fits a group of countries together with 30px padding', () => {
    const layout = layoutWith({ 1: { x0: 100, y0: 100, x1: 200, y1: 200 }, 2: { x0: 300, y0: 150, x1: 400, y1: 250 } });
    const view = viewFor({ kind: 'countries', ids: [1, 2] }, layout);

    // Group box: 100..400 x 100..250 -> k = min(800 / 360, 600 / 210)
    expect(view?.k).toBeCloseTo(800 / 360);
    expect(250 * (view?.k ?? 0) + (view?.x ?? 0)).toBeCloseTo(400);
  });

  it('returns null when the focus points at nothing known', () => {
    expect(viewFor({ kind: 'country', id: 999 }, layoutWith({}))).toBeNull();
    expect(viewFor({ kind: 'countries', ids: [999] }, layoutWith({}))).toBeNull();
  });
});

describe('focusKey', () => {
  it('is equal for equal focuses and different otherwise', () => {
    const a: MapFocus = { kind: 'countries', ids: [1, 2] };
    const b: MapFocus = { kind: 'countries', ids: [1, 2] };

    expect(focusKey(a)).toBe(focusKey(b));
    expect(focusKey(a)).not.toBe(focusKey({ kind: 'country', id: 1 }));
    expect(focusKey({ kind: 'world' })).toBe('world');
  });
});
