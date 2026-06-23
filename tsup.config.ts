import { createRequire, builtinModules } from 'module';
import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';

const { version } = createRequire(import.meta.url)('./package.json') as { version: string };
const define = { __APP_VERSION__: JSON.stringify(version) };

const builtins = new Set(builtinModules);

// noExternal:[/.*/] also strips Node.js built-ins from esbuild's external list,
// causing static require('events') etc. to be wrapped in a __require shim.
// In SEA ESM context require is undefined, so those shims throw at startup.
// This plugin runs before esbuild's default resolution and marks built-ins
// external so they become proper ESM static imports instead of shim calls.
const keepNodeBuiltinsExternal: Plugin = {
  name: 'keep-node-builtins-external',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      const bare = args.path.startsWith('node:') ? args.path.slice(5) : args.path;
      if (builtins.has(bare.split('/')[0] ?? '')) {
        return { external: true, path: args.path };
      }
    });
  },
};

// react-devtools-core is an optional ink dep gated behind a DEV_TOOLS env check.
// It's never installed. Stub it so no unresolved import leaks into the bundle
// (keeping it external emits an import statement that also breaks SEA startup).
const stubReactDevtools: Plugin = {
  name: 'stub-react-devtools-core',
  setup(build) {
    build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
      path: 'react-devtools-core',
      namespace: 'empty-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'empty-stub' }, () => ({
      contents: 'export default null;',
      loader: 'js',
    }));
  },
};

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node26',
  bundle: true,
  splitting: false,
  // Bundle all npm dependencies so the SEA binary is fully self-contained.
  // keepNodeBuiltinsExternal (above) undoes this for Node.js core modules.
  noExternal: [/.*/],
  esbuildPlugins: [keepNodeBuiltinsExternal, stubReactDevtools],
  // .mjs extension + mainFormat:"module" in sea-config tell Node 26 --build-sea
  // to embed the script as ESM, enabling top-level await in bundled deps.
  outExtension: () => ({ js: '.mjs' }),
  sourcemap: true,
  clean: true,
  define,
  banner: {
    // The shebang lets the npm-installed dist/cli.mjs run directly.
    // createRequire + require: esbuild wraps all CJS modules in __require shims
    // that check `typeof require !== 'undefined'`. In SEA ESM, require is not a
    // global, so every shim call throws. Injecting require here lets the shim use
    // it to resolve Node.js built-ins that CJS deps reference at runtime.
    js: [
      '#!/usr/bin/env node',
      'import { createRequire as __createRequire } from "module";',
      'const require = __createRequire(process.execPath);',
    ].join('\n'),
  },
});
