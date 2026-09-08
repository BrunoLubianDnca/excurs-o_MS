import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptsDirectory, '..');
const source = path.join(repositoryRoot, 'client', 'dist-familia');
const destination = path.join(repositoryRoot, 'dist-familia');

await stat(path.join(source, 'familia.html'));
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });

console.log(`Saída da Vercel preparada em ${destination}`);
