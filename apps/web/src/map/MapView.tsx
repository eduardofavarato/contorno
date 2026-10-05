import type { RegionId } from '@contorno/core';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { cx } from '../ui/cx';
import { RegionPaths, type MapTone } from './RegionPaths';
import { focusKey, viewFor, type MapFocus } from './focus';
import { createMapLayout } from './layout';
import type { MapData } from './mapData';
import { useElementSize } from './useElementSize';
import { useMapZoom } from './useMapZoom';
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
  /** Content for the hover tooltip; return `null` for no tooltip. */
  readonly renderTooltip?: (id: RegionId) => ReactNode;
}

interface Hover {
  readonly id: RegionId;
  readonly x: number;
  readonly y: number;
}

function regionIdOf(event: MouseEvent): RegionId | null {
  if (!(event.target instanceof Element)) return null;
  const raw = event.target.closest('[data-region-id]')?.getAttribute('data-region-id');
  return raw === null || raw === undefined ? null : Number(raw);
}

export function MapView({ data, tones = NO_TONES, focus = WORLD, onRegionClick, renderTooltip }: MapViewProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const size = useElementSize(areaRef);
  const layout = useMemo(() => (size ? createMapLayout(size, data) : null), [size, data]);
  const { scaleBy, moveTo } = useMapZoom(svgRef, viewportRef, size);
  const [hover, setHover] = useState<Hover | null>(null);

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

  const showHover = (event: MouseEvent) => {
    const id = regionIdOf(event);
    const area = areaRef.current;
    if (id === null || !area) {
      setHover(null);
      return;
    }
    const box = area.getBoundingClientRect();
    setHover({ id, x: event.clientX - box.left, y: event.clientY - box.top });
  };

  const tooltip = hover && renderTooltip?.(hover.id);
  const flip = hover && size ? { left: hover.x > size.width / 2, below: hover.y < size.height / 4 } : null;

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
            onClick={(event) => {
              const id = regionIdOf(event);
              if (id !== null) onRegionClick?.(id);
            }}
            onMouseOver={showHover}
            onMouseMove={showHover}
            onMouseLeave={() => {
              setHover(null);
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

      {hover && tooltip && flip && (
        <div
          className={cx(styles.tooltip, flip.left && styles.tooltipLeft, flip.below && styles.tooltipBelow)}
          style={{ left: hover.x, top: hover.y }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
