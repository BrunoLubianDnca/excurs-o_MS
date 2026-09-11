import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const root = fileURLToPath(new URL('../../', import.meta.url));
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('TREK completo: carga, repetição, edição, WebSocket e persistência após reinício', { timeout: 180000 }, async () => {
  await mkdir(path.join(root, '.run'), { recursive: true });
  const directory = await mkdtemp(path.join(root, '.run/smoke-'));
  const log = createWriteStream(path.join(directory, 'server.log'));
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const url = `http://127.0.0.1:${port}`;
  const password = randomBytes(24).toString('base64url');
  const env = { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port),
    COOKIE_SECURE: 'false', DEFAULT_LANGUAGE: 'br', TZ: 'America/Campo_Grande',
    TREK_DB_FILE: path.join(directory, 'travel.db'), ADMIN_EMAIL: 'smoke@example.test', ADMIN_PASSWORD: password };
  let processHandle;
  async function boot(environment) {
    processHandle = spawn(process.execPath, ['--require', 'tsconfig-paths/register', 'dist/index.js'], {
      cwd: path.join(root, 'server'), env: environment, stdio: ['ignore', 'pipe', 'pipe'],
    });
    processHandle.stdout.pipe(log, { end: false });
    processHandle.stderr.pipe(log, { end: false });
    for (let attempt = 0; attempt < 60; attempt++) {
      if (processHandle.exitCode !== null) throw new Error(`Servidor encerrou (${processHandle.exitCode}); veja ${directory}/server.log`);
      if (await fetch(`${url}/api/health`).then(r => r.ok, () => false)) return;
      await wait(500);
    }
    throw new Error(`Servidor indisponível; veja ${directory}/server.log`);
  }
  async function stop() {
    if (processHandle && processHandle.exitCode === null) {
      const exited = once(processHandle, 'exit');
      processHandle.kill();
      await exited;
    }
  }
  let token;
  async function api(route, method = 'GET', payload) {
    const result = await fetch(`${url}/api${route}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: payload === undefined ? undefined : JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    });
    const body = await result.json();
    assert.ok(result.ok, `${method} ${route}: ${result.status} ${body.error || ''}`);
    return body;
  }
  async function seed() {
    const child = spawn(process.execPath, ['scripts/setup-excursion.mjs'], {
      cwd: root, env: { ...env, TREK_SETUP_URL: url, TREK_SETUP_EMAIL: env.ADMIN_EMAIL, TREK_SETUP_PASSWORD: password },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
    const [code] = await once(child, 'exit');
    assert.equal(code, 0, `Carga falhou; veja ${directory}/server.log`);
  }
  try {
    await boot(env);
    const html = await fetch(url).then(r => r.text());
    assert.ok(html.includes('Excursão Família Lubian'));
    assert.ok(!html.includes('/familia/'));
    assert.equal((await fetch(`${url}/api/trips`)).status, 401);
    token = (await api('/auth/login', 'POST', { email: env.ADMIN_EMAIL, password })).token;
    await seed();
    await seed();
    const trips = (await api('/trips')).trips;
    assert.equal(trips.length, 1);
    const id = trips[0].id;
    const prefix = `/trips/${id}`;
    const members = (await api(`${prefix}/members`)).members.filter(member => member.is_guest);
    assert.equal(members.length, 36);
    assert.equal(members.filter(member => member.username === 'Helena').length, 2);
    assert.equal((await api(`${prefix}/days`)).days.length, 4);
    assert.equal((await api(`${prefix}/places`)).places.length, 2);
    assert.equal((await api(`${prefix}/reservations`)).reservations.length, 1);
    const costs = (await api(`${prefix}/budget`)).items;
    assert.equal(costs.length, 1);
    assert.equal(Number(costs[0].total_price), 18000);
    const config = await import('../../config/familia-lubian.excursion.json', { with: { type: 'json' } });
    assert.equal((await api(`${prefix}/todo`)).items.length, config.default.tasks.length);
    const created = await api(`${prefix}/todo`, 'POST', { name: 'Teste de persistência', category: 'Teste', priority: 2 });
    assert.ok(created.item.id);
    const wsToken = (await api('/auth/ws-token', 'POST')).token;
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${wsToken}`);
    try {
      const [message] = await Promise.race([once(socket, 'message'), wait(10000).then(() => { throw new Error('WebSocket não respondeu'); })]);
      assert.equal(JSON.parse(message.toString()).type, 'welcome');
    } finally { socket.close(); }
    await stop();
    await boot({ ...env, ADMIN_PASSWORD: randomBytes(24).toString('base64url') });
    token = (await api('/auth/login', 'POST', { email: env.ADMIN_EMAIL, password })).token;
    assert.ok((await api(`${prefix}/todo`)).items.some(item => item.id === created.item.id));
    await api(`${prefix}/todo/${created.item.id}`, 'DELETE');
    assert.equal((await api(`${prefix}/todo`)).items.length, config.default.tasks.length);
  } finally {
    await stop();
    log.end();
  }
});
