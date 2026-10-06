import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toBlob } from 'html-to-image';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownloadImage, supportsFileShare } from './shareImage';

vi.mock('html-to-image', () => ({ toBlob: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) } }));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn() },
  Directory: { Cache: 'CACHE' },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }));

/* eslint-disable @typescript-eslint/unbound-method -- these are vi.fn() mocks, not real methods */
const render = vi.mocked(toBlob);
const isNative = vi.mocked(Capacitor.isNativePlatform);
const writeFile = vi.mocked(Filesystem.writeFile);
const nativeShare = vi.mocked(Share.share);
/* eslint-enable @typescript-eslint/unbound-method */

const PNG = () => new Blob(['fake-png'], { type: 'image/png' });
const node = () => document.createElement('div');

function setNavigator(members: { canShare?: unknown; share?: unknown }) {
  Object.assign(navigator, members);
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
  isNative.mockReturnValue(false);
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('supportsFileShare', () => {
  it('is always true in the Android app, whatever the WebView offers', () => {
    isNative.mockReturnValue(true);

    expect(supportsFileShare()).toBe(true);
  });

  it('is false without navigator.canShare', () => {
    expect(supportsFileShare()).toBe(false);
  });

  it('follows what navigator.canShare says about files', () => {
    setNavigator({ canShare: vi.fn(() => true) });
    expect(supportsFileShare()).toBe(true);

    setNavigator({ canShare: vi.fn(() => false) });
    expect(supportsFileShare()).toBe(false);
  });

  it('is false when navigator.canShare throws', () => {
    setNavigator({
      canShare: vi.fn(() => {
        throw new Error('nope');
      }),
    });

    expect(supportsFileShare()).toBe(false);
  });
});

describe('shareOrDownloadImage', () => {
  it('keeps animation frames coming while the image renders, and stops afterwards', async () => {
    let finishRender: (blob: Blob) => void = () => undefined;
    render.mockReturnValue(
      new Promise((resolve) => {
        finishRender = resolve;
      }),
    );
    const frames = vi.spyOn(window, 'requestAnimationFrame');
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const done = shareOrDownloadImage(node(), 'a.png', 'A');
    await Promise.resolve();
    expect(frames.mock.calls.length).toBeGreaterThan(0);
    finishRender(PNG());
    await done;

    expect(render).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it('writes the image to the cache and opens the native share sheet in the Android app', async () => {
    render.mockResolvedValue(PNG());
    isNative.mockReturnValue(true);
    writeFile.mockResolvedValue({ uri: 'file:///cache/ranking.png' });
    nativeShare.mockResolvedValue({});

    await shareOrDownloadImage(node(), 'ranking.png', 'Ranking do Contorno');

    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'ranking.png', directory: 'CACHE' }));
    expect(nativeShare).toHaveBeenCalledWith({ files: ['file:///cache/ranking.png'], text: 'Ranking do Contorno' });
  });

  it('does not download when the native share sheet is cancelled', async () => {
    render.mockResolvedValue(PNG());
    isNative.mockReturnValue(true);
    writeFile.mockResolvedValue({ uri: 'file:///cache/ranking.png' });
    nativeShare.mockRejectedValue(new Error('cancelled'));
    const createObjectURL = vi.fn(() => 'blob:fake');
    URL.createObjectURL = createObjectURL;

    await expect(shareOrDownloadImage(node(), 'r.png', 'x')).resolves.toBeUndefined();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('shares the file through the Web Share API where the browser supports it', async () => {
    render.mockResolvedValue(PNG());
    const share = vi.fn(() => Promise.resolve());
    setNavigator({ canShare: vi.fn(() => true), share });

    await shareOrDownloadImage(node(), 'r.png', 'Legenda');

    expect(share).toHaveBeenCalledWith({ files: [expect.any(File)], text: 'Legenda' });
  });

  it('downloads the image when sharing files is not possible', async () => {
    render.mockResolvedValue(PNG());
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await shareOrDownloadImage(node(), 'ranking.png', 'x');

    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('does nothing when the image could not be rendered', async () => {
    render.mockResolvedValue(null);
    const createObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;

    await shareOrDownloadImage(node(), 'r.png', 'x');

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(nativeShare).not.toHaveBeenCalled();
  });
});
