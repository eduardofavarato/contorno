import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('GET /healthz', () => {
  it('reports the server as healthy, with the number of open rooms', async () => {
    app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', rooms: 0 });
  });

  it('sends security headers', async () => {
    app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.headers).toMatchObject({ 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY' });
  });
});

describe('web app', () => {
  async function appWithPage() {
    const publicDir = await mkdtemp(path.join(tmpdir(), 'contorno-'));
    await mkdir(path.join(publicDir, 'assets'));
    await writeFile(path.join(publicDir, 'index.html'), '<!doctype html><title>Contorno</title>');
    await writeFile(path.join(publicDir, 'assets', 'app-abc123.js'), 'console.log(1)');
    return buildApp({ publicDir });
  }

  it('serves the page, never cached', async () => {
    app = await appWithPage();
    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Contorno');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('serves hashed assets as immutable', async () => {
    app = await appWithPage();
    const response = await app.inject({ method: 'GET', url: '/assets/app-abc123.js' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('falls back to the page for unknown routes, but not for other methods', async () => {
    app = await appWithPage();

    expect((await app.inject({ method: 'GET', url: '/qualquer-coisa' })).body).toContain('Contorno');
    expect((await app.inject({ method: 'POST', url: '/qualquer-coisa' })).statusCode).toBe(404);
  });

  it('answers 404 when there is no page to serve', async () => {
    app = await buildApp();

    expect((await app.inject({ method: 'GET', url: '/' })).statusCode).toBe(404);
  });
});
