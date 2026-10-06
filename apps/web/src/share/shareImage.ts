import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toBlob } from 'html-to-image';

/**
 * Whether the share button can really share an image, as opposed to downloading it. The Web Share API with files is
 * mobile-only in practice and does not exist in an Android WebView, where the native Share plugin is used instead.
 */
export function supportsFileShare(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File([''], 'probe.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/**
 * html-to-image waits on one requestAnimationFrame before it draws; an Android WebView throttles rAF hard once the
 * user stops touching the screen, so that single frame could take 10+ seconds. A rAF loop of our own for the length of
 * the render keeps the compositor active.
 */
function keepFramesAlive(): () => void {
  let running = true;
  const tick = () => {
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => {
    running = false;
  };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      resolve(url.split(',')[1] ?? '');
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Could not read the image'));
    };
    reader.readAsDataURL(blob);
  });
}

/** Writes the image to the app's cache and opens Android's own share sheet (the Web Share API is absent in a WebView). */
async function shareNative(blob: Blob, filename: string, caption: string): Promise<void> {
  const data = await blobToBase64(blob);
  const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
  await Share.share({ files: [uri], text: caption });
}

/**
 * Renders `node` as a PNG and shares it with `caption` where files can be shared, or downloads it otherwise.
 * The node must be laid out in the DOM (off-screen is fine, `display: none` is not): the capture needs a real render.
 */
export async function shareOrDownloadImage(node: HTMLElement, filename: string, caption: string): Promise<void> {
  const stopKeepingFramesAlive = keepFramesAlive();
  let blob: Blob | null;
  try {
    blob = await toBlob(node);
  } finally {
    stopKeepingFramesAlive();
  }
  if (!blob) return;

  // Cancelling the share sheet rejects the promise; there is nothing to recover from, so it is not an error.
  if (Capacitor.isNativePlatform()) {
    await shareNative(blob, filename, caption).catch(() => undefined);
    return;
  }

  const file = new File([blob], filename, { type: 'image/png' });
  if (supportsFileShare() && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], text: caption }).catch(() => undefined);
    return;
  }
  downloadBlob(blob, filename);
}
