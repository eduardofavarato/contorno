import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { ViewTransform } from './focus';
import type { MapSize } from './layout';

const MIN_SCALE = 1;
const MAX_SCALE = 20;
const BUTTON_ZOOM_MS = 250;

export interface MapZoom {
  /** Zooms about the center of the map, e.g. 1.5 to zoom in and 1 / 1.5 to zoom out. */
  scaleBy: (factor: number) => void;
  /** Animates to `view`. */
  moveTo: (view: ViewTransform, durationMs: number) => void;
}

/**
 * Wires d3-zoom (wheel, drag, pinch) to the SVG and applies its transform to `viewportRef` directly,
 * so panning never goes through React renders.
 */
export function useMapZoom(
  svgRef: RefObject<SVGSVGElement | null>,
  viewportRef: RefObject<SVGGElement | null>,
  size: MapSize | null,
): MapZoom {
  const behaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    if (!size || !svg || !viewport) return;

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .translateExtent([
        [0, 0],
        [size.width, size.height],
      ])
      .on('zoom', (event: { transform: { toString(): string } }) => {
        viewport.setAttribute('transform', event.transform.toString());
      });
    select(svg).call(behavior).on('dblclick.zoom', null);
    behaviorRef.current = behavior;

    return () => {
      select(svg).interrupt().on('.zoom', null);
      behaviorRef.current = null;
    };
  }, [svgRef, viewportRef, size]);

  const scaleBy = useCallback(
    (factor: number) => {
      const behavior = behaviorRef.current;
      if (svgRef.current && behavior)
        select(svgRef.current)
          .transition()
          .duration(BUTTON_ZOOM_MS)
          .call((transition) => {
            behavior.scaleBy(transition, factor);
          });
    },
    [svgRef],
  );

  const moveTo = useCallback(
    (view: ViewTransform, durationMs: number) => {
      const behavior = behaviorRef.current;
      if (!svgRef.current || !behavior) return;
      const target = zoomIdentity.translate(view.x, view.y).scale(view.k);
      select(svgRef.current)
        .transition()
        .duration(durationMs)
        .call((transition) => {
          behavior.transform(transition, target);
        });
    },
    [svgRef],
  );

  return { scaleBy, moveTo };
}
