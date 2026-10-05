/** When an access token expires, in epoch milliseconds; 0 when it cannot be read (so it counts as expired). */
export function tokenExpiry(token: string): number {
  try {
    const payload = token.split('.')[1] ?? '';
    const json = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
    const { exp } = JSON.parse(json) as { exp?: unknown };
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}
