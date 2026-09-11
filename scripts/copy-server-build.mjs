import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../client/dist/', import.meta.url));
const destination = fileURLToPath(new URL('../server/public/', import.meta.url));
await stat(new URL('../client/dist/index.html', import.meta.url));
await mkdir(destination, { recursive: true });
// This is generated output only; user files live in server/uploads and server/data.
for (const entry of await readdir(destination)) {
  if (entry !== '.gitkeep') await rm(new URL(`../server/public/${entry}`, import.meta.url), { recursive: true, force: true });
}
await cp(source, destination, { recursive: true });
console.log('[build] TREK completo preparado em server/public.');
