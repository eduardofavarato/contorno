import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiRequestError, NetworkError, request } from './http';

// In the Android app the WebView answers every request to the app's own host from the app's files, API included,
// so API calls must go through the native HTTP client instead of fetch.
const mocks = vi.hoisted(() => ({ isNative: vi.fn(() => true), request: vi.fn() }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNative },
  CapacitorHttp: { request: mocks.request },
}));

const native = mocks.request;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  mocks.isNative.mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('request in the Android app', () => {
  it('goes through native HTTP to the real host, never through fetch', async () => {
    native.mockResolvedValue({ status: 200, data: { n: 1 }, headers: {}, url: '' });

    const result = await request('/config', { schema: z.object({ n: z.number() }) });

    expect(result).toEqual({ n: 1 });
    expect(native).toHaveBeenCalledWith({ url: `${window.location.origin}/api/v1/config`, method: 'GET', headers: {} });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the token and a JSON body', async () => {
    native.mockResolvedValue({ status: 200, data: { n: 1 }, headers: {}, url: '' });

    await request('/games', { method: 'POST', body: { a: 1 }, token: 'tok', schema: z.object({ n: z.number() }) });

    expect(native).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        data: { a: 1 },
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      }),
    );
  });

  it.each(['POST', 'DELETE'] as const)(
    'gives a bodiless %s an empty JSON body, so it is not refused with 415',
    async (method) => {
      native.mockResolvedValue({ status: 204, data: '', headers: {}, url: '' });

      await request('/me', { method });

      expect(native).toHaveBeenCalledWith(
        expect.objectContaining({ method, data: {}, headers: { 'Content-Type': 'application/json' } }),
      );
    },
  );

  it('turns an API error into an ApiRequestError', async () => {
    native.mockResolvedValue({ status: 409, data: { code: 'EMAIL_TAKEN', message: 'x' }, headers: {}, url: '' });

    await expect(request('/auth/signup', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
      status: 409,
    });
    await expect(request('/auth/signup', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiRequestError);
  });

  it('reports a network failure', async () => {
    native.mockRejectedValue(new Error('UnknownHostException'));

    await expect(request('/config')).rejects.toBeInstanceOf(NetworkError);
  });
});
