import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiRequestError, NetworkError, request } from './http';

const respond = (status: number, body?: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status }))),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request', () => {
  it('sends JSON and the access token, and validates the answer', async () => {
    respond(200, { n: 1 });

    const result = await request('/x', {
      method: 'POST',
      body: { a: 1 },
      token: 'tok',
      schema: z.object({ n: z.number() }),
    });

    expect(result).toEqual({ n: 1 });
    expect(fetch).toHaveBeenCalledWith('/api/v1/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      credentials: 'same-origin',
      body: '{"a":1}',
    });
  });

  it('turns an API error into an ApiRequestError with its code', async () => {
    respond(409, { code: 'EMAIL_TAKEN', message: 'Este e-mail já está em uso.' });

    await expect(request('/auth/signup', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'Error',
      code: 'EMAIL_TAKEN',
      status: 409,
      message: 'Este e-mail já está em uso.',
    });
  });

  it('treats an unexpected error body as an internal error', async () => {
    respond(502, { html: 'bad gateway' });

    await expect(request('/x')).rejects.toBeInstanceOf(ApiRequestError);
    await expect(request('/x')).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 502 });
  });

  it('reports a network failure separately', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    await expect(request('/x')).rejects.toBeInstanceOf(NetworkError);
  });

  it('resolves with nothing for no-content answers', async () => {
    respond(204);

    await expect(request('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
});
