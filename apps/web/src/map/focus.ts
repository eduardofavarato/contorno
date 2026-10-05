import type { CountryId } from '@contorno/core';
import type { Bounds, MapLayout, MapSize } from './layout';

/** What the map should frame: the whole world, one country, or a group (e.g. a continent). */
export type MapFocus =
  | { readonly kind: 'world' }
  | { readonly kind: 'country'; readonly id: CountryId }
  | { readonly kind: 'countries'; readonly ids: readonly CountryId[] };

/** Pan and zoom of the map's viewport: `translate(x, y) scale(k)`. */
export interface ViewTransform {
  readonly x: number;
  readonly y: number;
  readonly k: number;
}

export const WORLD_VIEW: ViewTransform = { x: 0, y: 0, k: 1 };

const GROUP_PADDING = 30;
const COUNTRY_PADDING_RATIO = 0.1;

/** Stable identity for a focus, so callers can pass a fresh object each render. */
export function focusKey(focus: MapFocus): string {
  switch (focus.kind) {
    case 'world':
      return 'world';
    case 'country':
      return `country:${String(focus.id)}`;
    case 'countries':
      return `countries:${focus.ids.join(',')}`;
  }
}

/** The view that centers `focus` in the map, or `null` when it points at nothing known. */
export function viewFor(focus: MapFocus, layout: MapLayout): ViewTransform | null {
  switch (focus.kind) {
    case 'world':
      return WORLD_VIEW;
    case 'country': {
      const bounds = layout.mainlandBounds(focus.id);
      return (
        bounds &&
        fitBounds(bounds, layout.size, Math.min(layout.size.width, layout.size.height) * COUNTRY_PADDING_RATIO)
      );
    }
    case 'countries': {
      const bounds = layout.boundsOf(focus.ids);
      return bounds && fitBounds(bounds, layout.size, GROUP_PADDING);
    }
  }
}

function fitBounds(bounds: Bounds, { width, height }: MapSize, padding: number): ViewTransform {
  const k = Math.min(width / (bounds.x1 - bounds.x0 + padding * 2), height / (bounds.y1 - bounds.y0 + padding * 2));
  return { k, x: (width - k * (bounds.x0 + bounds.x1)) / 2, y: (height - k * (bounds.y0 + bounds.y1)) / 2 };
}
