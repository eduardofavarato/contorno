import type { RegionId } from '@contorno/core';
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react';

/** How long a tooltip opened by a tap stays on screen: long enough to read, short enough not to hide the next round. */
export const TOUCH_TOOLTIP_MS = 3000;

/** The region a tooltip is about, and where it hangs (pixels from the map area's top-left corner). */
export interface TooltipAnchor {
  readonly id: RegionId;
  readonly x: number;
  readonly y: number;
}

/** The region drawn under the event's target, if any. */
export function regionIdOf(event: { readonly target: EventTarget }): RegionId | null {
  if (!(event.target instanceof Element)) return null;
  const raw = event.target.closest('[data-region-id]')?.getAttribute('data-region-id');
  return raw === null || raw === undefined ? null : Number(raw);
}

export interface RegionTooltip {
  readonly anchor: TooltipAnchor | null;
  /** Hover handlers for devices that hover (mouse, pen); touch is ignored, as browsers fake hover after a tap. */
  readonly pointerHandlers: {
    readonly onPointerDown: (event: PointerEvent) => void;
    readonly onPointerOver: (event: PointerEvent) => void;
    readonly onPointerMove: (event: PointerEvent) => void;
    readonly onPointerLeave: (event: PointerEvent) => void;
  };
  /** Call on every click: after a tap it opens the tooltip for a few seconds. */
  readonly onClick: (event: MouseEvent) => void;
}

/**
 * Which region's tooltip is showing on the map.
 *
 * A mouse hovers: the tooltip follows the cursor and goes when it leaves. A finger cannot hover, and the browser only
 * fakes it after a tap (with no matching "leave" until something else is tapped), so a tap opens the tooltip and it
 * closes by itself.
 */
export function useRegionTooltip(areaRef: RefObject<HTMLElement | null>): RegionTooltip {
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);
  const lastPointerType = useRef('mouse');
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(hideTimer.current);
    },
    [],
  );

  const anchorAt = (event: MouseEvent): TooltipAnchor | null => {
    const id = regionIdOf(event);
    const area = areaRef.current;
    if (id === null || !area) return null;
    const box = area.getBoundingClientRect();
    return { id, x: event.clientX - box.left, y: event.clientY - box.top };
  };

  const show = (next: TooltipAnchor | null, hideAfterMs?: number) => {
    clearTimeout(hideTimer.current);
    setAnchor(next);
    if (next && hideAfterMs !== undefined) {
      hideTimer.current = setTimeout(() => {
        setAnchor(null);
      }, hideAfterMs);
    }
  };

  const hover = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') show(anchorAt(event));
  };

  return {
    anchor,
    pointerHandlers: {
      onPointerDown: (event) => {
        lastPointerType.current = event.pointerType;
      },
      onPointerOver: hover,
      onPointerMove: hover,
      onPointerLeave: (event) => {
        if (event.pointerType !== 'touch') show(null);
      },
    },
    // The click, not the touch start, so that dragging or pinching the map does not open tooltips.
    onClick: (event) => {
      if (lastPointerType.current === 'touch') show(anchorAt(event), TOUCH_TOOLTIP_MS);
    },
  };
}
