/**
 * Shares plain text through the system share sheet when there is one (phones), or opens WhatsApp (app or web) with the
 * text filled in otherwise (mostly desktops).
 */
export function shareText(text: string): void {
  if (typeof navigator.share === 'function') {
    // Cancelling the share sheet rejects the promise; nothing to recover from.
    navigator.share({ text }).catch(() => undefined);
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}
