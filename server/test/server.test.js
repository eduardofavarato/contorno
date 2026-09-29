import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import WebSocket from 'ws';
import { DB } from '../../shared/countries.js';
import { createContornoServer } from '../src/server.js';

const ALLOWED_ORIGIN = 'https://contorno.fvrt.com.br';

let app;
let baseUrl;

before(async () => {
  const publicDir = await mkdtemp(path.join(tmpdir(), 'contorno-'));
  await writeFile(path.join(publicDir, 'index.html'), '<!DOCTYPE html><title>Contorno</title>');
  app = createContornoServer({ publicDir, allowedOrigins: [ALLOWED_ORIGIN], log: () => {} });
  await new Promise(resolve => app.server.listen(0, resolve));
  baseUrl = `127.0.0.1:${app.server.address().port}`;
});

after(() => app.close());

/** A WebSocket client that queues incoming messages so tests can await them in order. */
function connect(query, origin = ALLOWED_ORIGIN) {
  const ws = new WebSocket(`ws://${baseUrl}/ws?${query}`, { origin });
  const inbox = [];
  const waiters = [];
  ws.on('message', data => {
    const message = JSON.parse(data.toString());
    const waiter = waiters.findIndex(w => w.type === message.type);
    if (waiter === -1) inbox.push(message);
    else waiters.splice(waiter, 1)[0].resolve(message);
  });
  const next = type => {
    const queued = inbox.findIndex(message => message.type === type);
    if (queued !== -1) return Promise.resolve(inbox.splice(queued, 1)[0]);
    return new Promise(resolve => waiters.push({ type, resolve }));
  };
  const send = message => ws.send(typeof message === 'string' ? message : JSON.stringify(message));
  return { ws, next, send };
}

describe('HTTP', () => {
  it('serves the web app and a health check', async () => {
    const page = await fetch(`http://${baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Contorno/);

    const health = await fetch(`http://${baseUrl}/healthz`);
    assert.equal((await health.json()).status, 'ok');
  });
});

describe('online duel over WebSocket', () => {
  it('creates a room, lets the opponent join by code and plays a question end to end', async () => {
    const host = connect('intent=create&level=1');
    const { code } = await host.next('room_created');
    assert.match(code, /^[A-Z2-9]{4}$/);
    assert.equal((await host.next('assigned')).role, 'a');

    const guest = connect(`intent=join&room=${code.toLowerCase()}`);
    assert.equal((await guest.next('assigned')).role, 'b');
    await Promise.all([host.next('both_connected'), guest.next('both_connected')]);

    const question = await host.next('question');
    await guest.next('question');
    host.send('{not json');
    host.send({ type: 'answer', value: DB[question.countryId].a[0] });

    const result = await guest.next('answer_result');
    assert.equal(result.correct, true);
    assert.deepEqual(result.scores, [2000, 0]);

    host.ws.close();
    assert.equal((await guest.next('opponent_left')).type, 'opponent_left');
    guest.ws.close();
  });

  it('rejects unknown rooms, a third player and bad levels', async () => {
    assert.equal((await connect('intent=join&room=ZZZZ').next('room_not_found')).type, 'room_not_found');
    assert.equal((await connect('intent=create&level=9').next('invalid_level')).type, 'invalid_level');

    const host = connect('intent=create&level=2');
    const { code } = await host.next('room_created');
    const guest = connect(`intent=join&room=${code}`);
    await guest.next('assigned');
    assert.equal((await connect(`intent=join&room=${code}`).next('room_full')).type, 'room_full');
    host.ws.close();
    guest.ws.close();
  });

  it('refuses WebSocket connections from origins that are not allowed', async () => {
    const intruder = new WebSocket(`ws://${baseUrl}/ws?intent=create&level=1`, { origin: 'https://evil.example' });
    const error = await new Promise(resolve => intruder.on('error', resolve));
    assert.match(error.message, /403/);
  });
});
