import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/**
 * Shares plain text through the system share sheet when there is one (phones, and the Android app through its native
 * plugin, since an Android WebView has no Web Share API), or opens WhatsApp (app or web) with the text filled in
 * otherwise (mostly desktops).
 */
export function shareText(text: string): void {
  // Cancelling the share sheet rejects the promise; nothing to recover from.
  if (Capacitor.isNativePlatform()) {
    Share.share({ text }).catch(() => undefined);
    return;
  }
  if (typeof navigator.share === 'function') {
    navigator.share({ text }).catch(() => undefined);
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}
