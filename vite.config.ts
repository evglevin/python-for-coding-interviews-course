import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pyodideVersion: string = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'node_modules', 'pyodide', 'package.json'), 'utf8')
).version;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __PYODIDE_VERSION__: JSON.stringify(pyodideVersion),
  },
  worker: {
    format: 'es',
  },
});
