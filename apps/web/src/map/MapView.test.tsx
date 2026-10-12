import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryRequired, stubResizeObserver } from '../test-utils';
import type { MapTone } from './RegionPaths';
import { BRASIL_MAP } from './brasil';
import { MapView } from './MapView';
import { TOUCH_TOOLTIP_MS } from './useRegionTooltip';
import { WORLD_MAP } from './world';

const BRASIL = 76;
const ARGENTINA = 32;

const countryPath = (container: HTMLElement, id: number) =>
  queryRequired(container, `[data-region-id="${String(id)}"]`);

describe('MapView', () => {
  it('draws nothing until the container has a size', () => {
    stubResizeObserver(null);
    render(<MapView data={WORLD_MAP} />);

    expect(screen.queryByRole('img', { name: 'Mapa-múndi' })).not.toBeInTheDocument();
  });

  it('draws a path per country once sized', () => {
    stubResizeObserver();
    const { container } = render(<MapView data={WORLD_MAP} />);

    expect(screen.getByRole('img', { name: 'Mapa-múndi' })).toBeInTheDocument();
    expect(countryPath(container, BRASIL)).toBeInTheDocument();
    expect(countryPath(container, ARGENTINA)).toBeInTheDocument();
  });

  it('paints countries according to their tone', () => {
    stubResizeObserver();
    const tones = new Map<number, MapTone>([[BRASIL, 'correct']]);
    const { container } = render(<MapView data={WORLD_MAP} tones={tones} />);

    expect(countryPath(container, BRASIL).getAttribute('class')).toMatch(/correct/);
    expect(countryPath(container, ARGENTINA).getAttribute('class')).toMatch(/neutral/);
  });

  it('reports clicks on a country, and ignores clicks elsewhere', () => {
    stubResizeObserver();
    const onRegionClick = vi.fn();
    const { container } = render(<MapView data={WORLD_MAP} onRegionClick={onRegionClick} />);

    fireEvent.click(countryPath(container, BRASIL));
    expect(onRegionClick).toHaveBeenCalledExactlyOnceWith(BRASIL);

    fireEvent.click(queryRequired(container, 'svg'));
    expect(onRegionClick).toHaveBeenCalledTimes(1);
  });

  describe('tooltip', () => {
    const at = { clientX: 100, clientY: 100 };

    function renderWithTooltip() {
      stubResizeObserver();
      const { container } = render(<MapView data={WORLD_MAP} renderTooltip={(id) => `país ${String(id)}`} />);
      return { container, brasil: countryPath(container, BRASIL), argentina: countryPath(container, ARGENTINA) };
    }

    /** What a finger does on a country: a touch start, then the click that ends the tap. */
    const tap = (country: Element) => {
      fireEvent.pointerDown(country, { pointerType: 'touch', ...at });
      fireEvent.click(country, at);
    };

    describe('with a mouse', () => {
      it('shows while hovering a country and goes when the cursor leaves the map', () => {
        const { container, brasil } = renderWithTooltip();

        fireEvent.pointerOver(brasil, { pointerType: 'mouse', ...at });
        expect(screen.getByText('país 76')).toBeInTheDocument();

        fireEvent.pointerLeave(queryRequired(container, 'svg > g'), { pointerType: 'mouse' });
        expect(screen.queryByText('país 76')).not.toBeInTheDocument();
      });

      it('follows the cursor to the next country', () => {
        const { brasil, argentina } = renderWithTooltip();

        fireEvent.pointerOver(brasil, { pointerType: 'mouse', ...at });
        fireEvent.pointerMove(argentina, { pointerType: 'mouse', ...at });

        expect(screen.queryByText('país 76')).not.toBeInTheDocument();
        expect(screen.getByText('país 32')).toBeInTheDocument();
      });

      it('stays for as long as the cursor stays', () => {
        vi.useFakeTimers();
        const { brasil } = renderWithTooltip();

        fireEvent.pointerOver(brasil, { pointerType: 'mouse', ...at });
        act(() => {
          vi.advanceTimersByTime(TOUCH_TOOLTIP_MS * 3);
        });

        expect(screen.getByText('país 76')).toBeInTheDocument();
        vi.useRealTimers();
      });
    });

    describe('with a finger', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      const wait = (ms: number) => {
        act(() => {
          vi.advanceTimersByTime(ms);
        });
      };

      it('opens on a tap and closes by itself', () => {
        const { brasil } = renderWithTooltip();

        tap(brasil);
        expect(screen.getByText('país 76')).toBeInTheDocument();

        wait(TOUCH_TOOLTIP_MS - 1);
        expect(screen.getByText('país 76')).toBeInTheDocument();
        wait(1);
        expect(screen.queryByText('país 76')).not.toBeInTheDocument();
      });

      it('ignores the hover the browser fakes after a tap', () => {
        const { brasil } = renderWithTooltip();

        fireEvent.pointerOver(brasil, { pointerType: 'touch', ...at });
        fireEvent.pointerMove(brasil, { pointerType: 'touch', ...at });

        expect(screen.queryByText('país 76')).not.toBeInTheDocument();
      });

      it('does not close when the finger is lifted, as touch pointers "leave" at the end of every tap', () => {
        const { container, brasil } = renderWithTooltip();

        tap(brasil);
        fireEvent.pointerLeave(queryRequired(container, 'svg > g'), { pointerType: 'touch' });

        expect(screen.getByText('país 76')).toBeInTheDocument();
      });

      it('does not open when the finger only drags the map (no click follows)', () => {
        const { brasil } = renderWithTooltip();

        fireEvent.pointerDown(brasil, { pointerType: 'touch', ...at });
        fireEvent.pointerMove(brasil, { pointerType: 'touch', clientX: 140, clientY: 120 });

        expect(screen.queryByText('país 76')).not.toBeInTheDocument();
      });

      it('replaces the tooltip on another tap and restarts the countdown', () => {
        const { brasil, argentina } = renderWithTooltip();

        tap(brasil);
        wait(TOUCH_TOOLTIP_MS - 500);
        tap(argentina);

        expect(screen.queryByText('país 76')).not.toBeInTheDocument();
        expect(screen.getByText('país 32')).toBeInTheDocument();

        wait(TOUCH_TOOLTIP_MS - 1);
        expect(screen.getByText('país 32')).toBeInTheDocument();
        wait(1);
        expect(screen.queryByText('país 32')).not.toBeInTheDocument();
      });

      it('closes on a tap outside any country', () => {
        const { container, brasil } = renderWithTooltip();

        tap(brasil);
        tap(queryRequired(container, 'svg > g > path'));

        expect(screen.queryByText('país 76')).not.toBeInTheDocument();
      });

      it('still reports the tap as a click on the country', () => {
        stubResizeObserver();
        const onRegionClick = vi.fn();
        const { container } = render(
          <MapView data={WORLD_MAP} onRegionClick={onRegionClick} renderTooltip={() => 'dica'} />,
        );

        tap(countryPath(container, BRASIL));

        expect(onRegionClick).toHaveBeenCalledExactlyOnceWith(BRASIL);
      });

      it('does not try to update after the map is gone', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { brasil } = renderWithTooltip();
        tap(brasil);
        cleanup();

        wait(TOUCH_TOOLTIP_MS);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
      });
    });
  });

  it('offers a locate button only when focused on something', () => {
    stubResizeObserver();
    const { rerender } = render(<MapView data={WORLD_MAP} />);
    expect(screen.queryByRole('button', { name: 'Localizar país' })).not.toBeInTheDocument();

    rerender(<MapView data={WORLD_MAP} focus={{ kind: 'region', id: BRASIL }} />);
    expect(screen.getByRole('button', { name: 'Localizar país' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aproximar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Afastar' })).toBeInTheDocument();
  });

  it('draws the map it is given', () => {
    stubResizeObserver();
    const { container } = render(<MapView data={BRASIL_MAP} />);

    expect(screen.getByRole('img', { name: 'Mapa do Brasil' })).toBeInTheDocument();
    expect(countryPath(container, 35)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-region-id]')).toHaveLength(27);
  });
});
