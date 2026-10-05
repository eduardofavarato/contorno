import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useElapsed } from './useElapsed';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useElapsed', () => {
  it('starts at zero and follows the clock while running', () => {
    const { result } = renderHook(() => useElapsed(true));
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(65_000);
    });

    expect(result.current).toBe(65_000);
  });

  it('freezes when it stops running', () => {
    const { result, rerender } = renderHook(({ running }) => useElapsed(running), { initialProps: { running: true } });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    rerender({ running: false });
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).toBe(10_000);
  });
});
