import { spawn } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env'), quiet: true });
dotenv.config({ path: path.join(root, 'server/.env'), quiet: true });
const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: process.env.PORT || '3001',
  DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE || 'br',
  TZ: process.env.TZ || 'America/Campo_Grande',
};
const dataDirectory = env.TREK_DB_FILE ? path.dirname(path.resolve(root, 'server', env.TREK_DB_FILE)) : path.join(root, 'server/data');
const marker = path.join(dataDirectory, 'familia-lubian.seed');
const exists = async (file) => access(file).then(() => true, () => false);
if (!await exists(path.join(root, 'server/dist/index.js')) || !await exists(path.join(root, 'server/public/index.html'))) {
  throw new Error('Execute npm run build antes de iniciar o TREK completo.');
}
const server = spawn(process.execPath, ['--require', 'tsconfig-paths/register', 'dist/index.js'], {
  cwd: path.join(root, 'server'), env, stdio: 'inherit',
});
let stopped = false;
server.on('exit', (code) => { stopped = true; process.exitCode = code ?? 1; });
server.on('error', (error) => { stopped = true; console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));

// Seed once after the real API is ready, never overwrite planning on a restart.
// Credentials stay on the server and never enter Vite's public environment.
const email = env.TREK_SETUP_EMAIL || env.ADMIN_EMAIL;
const password = env.TREK_SETUP_PASSWORD || env.ADMIN_PASSWORD;
if (!await exists(marker) && email && password) {
  try {
    const url = `http://127.0.0.1:${env.PORT}`;
    let healthy = false;
    for (let attempt = 0; attempt < 90 && !stopped; attempt++) {
      healthy = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) })
        .then((response) => response.ok, () => false);
      if (healthy) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!healthy) throw new Error('O backend não ficou disponível para preparar a excursão.');
    const setup = spawn(process.execPath, ['scripts/setup-excursion.mjs'], {
      cwd: root,
      env: { ...env, TREK_SETUP_URL: url, TREK_SETUP_EMAIL: email, TREK_SETUP_PASSWORD: password },
      stdio: 'inherit',
    });
    await new Promise((resolve, reject) => {
      setup.on('error', reject);
      setup.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Carga da excursão falhou (${code}).`)));
    });
    await mkdir(path.dirname(marker), { recursive: true });
    await writeFile(marker, new Date().toISOString(), { flag: 'wx' });
    console.log('[excursão] TREK completo com a viagem Família Lubian pronto.');
  } catch (error) {
    console.error(`[excursão] ${error.message} Corrija a configuração e execute npm run setup:familia-lubian.`);
  }
} else if (!await exists(marker)) {
  console.log('[excursão] Após o primeiro acesso, defina TREK_SETUP_EMAIL e TREK_SETUP_PASSWORD e execute npm run setup:familia-lubian para carregar a viagem.');
}
