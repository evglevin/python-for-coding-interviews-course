import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'node_modules', 'pyodide');
const pyodideBaseDir = path.join(rootDir, 'public', 'pyodide');

if (!fs.existsSync(srcDir)) {
  console.log('[copy-pyodide] node_modules/pyodide not found yet, skipping.');
  process.exit(0);
}

const pyodidePkg = JSON.parse(fs.readFileSync(path.join(srcDir, 'package.json'), 'utf8'));
const version = pyodidePkg.version;
if (!version) {
  throw new Error('[copy-pyodide] Could not read pyodide version from package.json');
}

const destDir = path.join(pyodideBaseDir, version);

const filesToCopy = [
  'pyodide.mjs',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'python_stdlib.zip',
];

fs.mkdirSync(destDir, { recursive: true });

// Remove stale unversioned files or previous pyodide version folders so dist/ stays clean.
for (const entry of fs.readdirSync(pyodideBaseDir)) {
  if (entry !== version) {
    fs.rmSync(path.join(pyodideBaseDir, entry), { recursive: true, force: true });
  }
}

let copied = 0;
for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (!fs.existsSync(src)) continue;

  const shouldCopy =
    !fs.existsSync(dest) ||
    fs.statSync(src).size !== fs.statSync(dest).size;

  if (shouldCopy) {
    fs.copyFileSync(src, dest);
    copied++;
  }
}

if (copied > 0) {
  console.log(`[copy-pyodide] Copied ${copied} Pyodide runtime files to public/pyodide/${version}/`);
}
