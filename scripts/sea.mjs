#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const target = process.argv[2];
const VALID = ['linux', 'macos-x64', 'macos-arm64', 'win'];

if (!VALID.includes(target)) {
  console.error(`Usage: node scripts/sea.mjs <${VALID.join('|')}>`);
  process.exit(1);
}

const outName = target === 'win' ? 'ghtasktui-win.exe' : `ghtasktui-${target}`;
const outPath = join(root, 'bin', outName);
const isMacos = target.startsWith('macos');

mkdirSync(join(root, 'bin'), { recursive: true });

// Write a per-invocation config so each platform gets its own output path.
// Node 26 --build-sea reads mainFormat:"module" to embed the script as ESM,
// enabling top-level await in bundled deps (ink/yoga-layout use TLA for WASM).
const config = {
  main: 'dist/cli.mjs',
  mainFormat: 'module',
  output: join('bin', outName),
  disableExperimentalSEAWarning: true,
};
const tmpConfig = join(root, '.sea-config.tmp.json');
writeFileSync(tmpConfig, JSON.stringify(config));

try {
  execSync(`node --build-sea "${tmpConfig}"`, { cwd: root, stdio: 'inherit' });
} finally {
  try { unlinkSync(tmpConfig); } catch (_) {}
}

// Ad-hoc signing is required on macOS — Gatekeeper rejects unsigned binaries.
if (isMacos) execSync(`codesign --sign - "${outPath}"`, { stdio: 'inherit' });

console.log(`\n✓  ${outPath}`);
