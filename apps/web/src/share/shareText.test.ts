import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareText } from './shareText';

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
});
