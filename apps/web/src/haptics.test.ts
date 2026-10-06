import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAPTICS, vibrate } from './haptics';

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
});

describe('vibrate', () => {
  it('does nothing where the device cannot vibrate', () => {
    expect(() => {
      vibrate(HAPTICS.tap);
    }).not.toThrow();
  });

  it('vibrates with a single duration or a pattern', () => {
    const spy = vi.fn(() => true);
    Object.assign(navigator, { vibrate: spy });

    vibrate(HAPTICS.press);
    vibrate(HAPTICS.wrong);

    expect(spy).toHaveBeenNthCalledWith(1, 15);
    expect(spy).toHaveBeenNthCalledWith(2, [30, 40, 30]);
  });

  it('survives a browser that refuses to vibrate', () => {
    Object.assign(navigator, {
      vibrate: () => {
        throw new Error('NotAllowedError');
      },
    });

    expect(() => {
      vibrate(HAPTICS.right);
    }).not.toThrow();
  });
});
