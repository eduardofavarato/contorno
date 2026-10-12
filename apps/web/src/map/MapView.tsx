import type { RegionId } from '@contorno/core';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { cx } from '../ui/cx';
import { RegionPaths, type MapTone } from './RegionPaths';
import { focusKey, viewFor, type MapFocus } from './focus';
import { createMapLayout } from './layout';
import type { MapData } from './mapData';
import { useElementSize } from './useElementSize';
import { useMapZoom } from './useMapZoom';
import { regionIdOf, useRegionTooltip } from './useRegionTooltip';
import styles from './MapView.module.css';

export type { MapTone } from './RegionPaths';

const ZOOM_IN_FACTOR = 1.5;
const FOCUS_MS = 900;
const REFOCUS_MS = 300;
const NO_TONES: ReadonlyMap<RegionId, MapTone> = new Map();
const WORLD: MapFocus = { kind: 'world' };

export interface MapViewProps {
  /** The map to draw. */
  readonly data: MapData;
  readonly tones?: ReadonlyMap<RegionId, MapTone>;
  /** What to frame; the map animates there whenever it changes. */
  readonly focus?: MapFocus;
  /** When set, countries are clickable (Modo Localizar and Modo Livre). */
  readonly onRegionClick?: (id: RegionId) => void;
  /** Content for the tooltip (shown on hover with a mouse, for a few seconds after a tap on a touch screen); `null` for none. */
  readonly renderTooltip?: (id: RegionId) => ReactNode;
}

export function MapView({ data, tones = NO_TONES, focus = WORLD, onRegionClick, renderTooltip }: MapViewProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const size = useElementSize(areaRef);
  const layout = useMemo(() => (size ? createMapLayout(size, data) : null), [size, data]);
  const { scaleBy, moveTo } = useMapZoom(svgRef, viewportRef, size);
  const { anchor, pointerHandlers, onClick: showTooltipOnTap } = useRegionTooltip(areaRef);

  const key = focusKey(focus);
  const lastFocusKey = useRef<string | null>(null);
  const applyFocus = useCallback(
    (duration: number) => {
      const view = layout && viewFor(focus, layout);
      if (view) moveTo(view, duration);
    },
    // `key` stands in for `focus`, which callers may recreate on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, key, moveTo],
  );

  useEffect(() => {
    applyFocus(lastFocusKey.current === key ? REFOCUS_MS : FOCUS_MS);
    lastFocusKey.current = key;
  }, [applyFocus, key]);

  const tooltip = anchor && renderTooltip?.(anchor.id);
  const flip = anchor && size ? { left: anchor.x > size.width / 2, below: anchor.y < size.height / 4 } : null;

  return (
    <div ref={areaRef} className={styles.area}>
      {layout && (
        <svg
          ref={svgRef}
          className={cx(styles.svg, onRegionClick && styles.clickable)}
          viewBox={`0 0 ${String(layout.size.width)} ${String(layout.size.height)}`}
          role="img"
          aria-label={data.label}
        >
          <g
            ref={viewportRef}
            {...pointerHandlers}
            onClick={(event) => {
              const id = regionIdOf(event);
              if (id !== null) onRegionClick?.(id);
              showTooltipOnTap(event);
            }}
          >
            <path className={styles.sphere} d={layout.spherePath} />
            <path className={styles.graticule} d={layout.graticulePath} />
            <RegionPaths countries={layout.countries} tones={tones} />
            <path className={styles.borders} d={layout.bordersPath} />
          </g>
        </svg>
      )}

      <div className={styles.controls}>
        {focus.kind !== 'world' && (
          <button
            type="button"
            className={cx(styles.control, styles.locate)}
            title="Localizar país"
            aria-label="Localizar país"
            onClick={() => {
              applyFocus(FOCUS_MS);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="2" x2="12" y2="4.5" />
              <line x1="12" y1="19.5" x2="12" y2="22" />
              <line x1="2" y1="12" x2="4.5" y2="12" />
              <line x1="19.5" y1="12" x2="22" y2="12" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className={styles.control}
          title="Aproximar"
          aria-label="Aproximar"
          onClick={() => {
            scaleBy(ZOOM_IN_FACTOR);
          }}
        >
          +
        </button>
        <button
          type="button"
          className={styles.control}
          title="Afastar"
          aria-label="Afastar"
          onClick={() => {
            scaleBy(1 / ZOOM_IN_FACTOR);
          }}
        >
          −
        </button>
      </div>

      {anchor && tooltip && flip && (
        <div
          className={cx(styles.tooltip, flip.left && styles.tooltipLeft, flip.below && styles.tooltipBelow)}
          style={{ left: anchor.x, top: anchor.y }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
