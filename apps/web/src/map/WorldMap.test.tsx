import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { queryRequired, stubResizeObserver } from '../test-utils';
import type { MapTone } from './CountryPaths';
import { WorldMap } from './WorldMap';

const BRASIL = 76;
const ARGENTINA = 32;

const countryPath = (container: HTMLElement, id: number) =>
  queryRequired(container, `[data-country-id="${String(id)}"]`);

describe('WorldMap', () => {
  it('draws nothing until the container has a size', () => {
    stubResizeObserver(null);
    render(<WorldMap />);

    expect(screen.queryByRole('img', { name: 'Mapa-múndi' })).not.toBeInTheDocument();
  });

  it('draws a path per country once sized', () => {
    stubResizeObserver();
    const { container } = render(<WorldMap />);

    expect(screen.getByRole('img', { name: 'Mapa-múndi' })).toBeInTheDocument();
    expect(countryPath(container, BRASIL)).toBeInTheDocument();
    expect(countryPath(container, ARGENTINA)).toBeInTheDocument();
  });

  it('paints countries according to their tone', () => {
    stubResizeObserver();
    const tones = new Map<number, MapTone>([[BRASIL, 'correct']]);
    const { container } = render(<WorldMap tones={tones} />);

    expect(countryPath(container, BRASIL).getAttribute('class')).toMatch(/correct/);
    expect(countryPath(container, ARGENTINA).getAttribute('class')).toMatch(/neutral/);
  });

  it('reports clicks on a country, and ignores clicks elsewhere', () => {
    stubResizeObserver();
    const onCountryClick = vi.fn();
    const { container } = render(<WorldMap onCountryClick={onCountryClick} />);

    fireEvent.click(countryPath(container, BRASIL));
    expect(onCountryClick).toHaveBeenCalledExactlyOnceWith(BRASIL);

    fireEvent.click(queryRequired(container, 'svg'));
    expect(onCountryClick).toHaveBeenCalledTimes(1);
  });

  it('shows the tooltip while hovering a country', () => {
    stubResizeObserver();
    const { container } = render(<WorldMap renderTooltip={(id) => `país ${String(id)}`} />);

    fireEvent.mouseOver(countryPath(container, BRASIL), { clientX: 100, clientY: 100 });
    expect(screen.getByText('país 76')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseLeave(queryRequired(container, 'svg > g'));
    });
    expect(screen.queryByText('país 76')).not.toBeInTheDocument();
  });

  it('offers a locate button only when focused on something', () => {
    stubResizeObserver();
    const { rerender } = render(<WorldMap />);
    expect(screen.queryByRole('button', { name: 'Localizar país' })).not.toBeInTheDocument();

    rerender(<WorldMap focus={{ kind: 'country', id: BRASIL }} />);
    expect(screen.getByRole('button', { name: 'Localizar país' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aproximar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Afastar' })).toBeInTheDocument();
  });
});
