import { Capacitor } from '@capacitor/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareText } from './shareText';

const nativeShare = vi.hoisted(() => vi.fn(() => Promise.resolve({})));
vi.mock('@capacitor/share', () => ({ Share: { share: nativeShare } }));

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share');
  vi.restoreAllMocks();
});

describe('shareText', () => {
  it('uses the system share sheet when there is one', () => {
    const share = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { share });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    shareText('Olá mundo');

    expect(share).toHaveBeenCalledWith({ text: 'Olá mundo' });
    expect(open).not.toHaveBeenCalled();
  });

  it('does not throw when the share sheet is cancelled', () => {
    Object.assign(navigator, { share: vi.fn(() => Promise.reject(new Error('AbortError'))) });

    expect(() => {
      shareText('Olá');
    }).not.toThrow();
  });

  it('opens WhatsApp with the text when there is no share sheet', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    shareText('Olá mundo');

    expect(open).toHaveBeenCalledWith('https://wa.me/?text=Ol%C3%A1%20mundo', '_blank', 'noopener,noreferrer');
  });

  it('uses the native share sheet inside the Android app', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const share = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { share });

    shareText('Olá mundo');

    expect(nativeShare).toHaveBeenCalledWith({ text: 'Olá mundo' });
    expect(share).not.toHaveBeenCalled();
  });
});
