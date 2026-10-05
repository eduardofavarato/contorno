import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { queryRequired, stubResizeObserver } from '../test-utils';
import type { MapTone } from './RegionPaths';
import { BRASIL_MAP } from './brasil';
import { MapView } from './MapView';
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

  it('shows the tooltip while hovering a country', () => {
    stubResizeObserver();
    const { container } = render(<MapView data={WORLD_MAP} renderTooltip={(id) => `país ${String(id)}`} />);

    fireEvent.mouseOver(countryPath(container, BRASIL), { clientX: 100, clientY: 100 });
    expect(screen.getByText('país 76')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseLeave(queryRequired(container, 'svg > g'));
    });
    expect(screen.queryByText('país 76')).not.toBeInTheDocument();
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
