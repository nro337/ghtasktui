import { createRequire } from 'module';
import { defineConfig } from 'tsup';

const { version } = createRequire(import.meta.url)('./package.json') as { version: string };
const define = { __APP_VERSION__: JSON.stringify(version) };

export default defineConfig([
  {
    entry: ['src/cli.tsx'],
    format: ['esm'],
    target: 'node20',
    bundle: true,
    sourcemap: true,
    clean: true,
    define,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  {
    // CJS bundle for pkg standalone binary packaging — pkg cannot parse ESM/import.meta
    entry: ['src/cli.tsx'],
    format: ['cjs'],
    target: 'node20',
    bundle: true,
    outDir: 'dist-pkg',
    outExtension: () => ({ js: '.js' }),
    clean: true,
    define,
  },
]);
