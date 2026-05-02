// Zip dist/ into dapp-inspector-<version>.zip for Chrome Web Store upload.
// Run via: pnpm pack:release  (which also re-runs typecheck/lint/test/build first)
//
// Uses the `zip` CLI for portability — no extra dependency to maintain.

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const distDir = resolve(root, 'dist');
const outZip = resolve(root, `dapp-inspector-${pkg.version}.zip`);

if (!existsSync(distDir)) {
  console.error(`✗ dist/ not found — did the build step succeed?`);
  process.exit(1);
}

// Sanity-check the manifest the build produced
const manifestPath = resolve(distDir, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`✗ dist/manifest.json missing — vite/crxjs build is broken`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.version !== pkg.version) {
  console.error(`✗ manifest.version (${manifest.version}) != package.json.version (${pkg.version})`);
  process.exit(1);
}
if (Array.isArray(manifest.permissions) && manifest.permissions.includes('scripting')) {
  console.error(`✗ manifest still requests "scripting" permission — should have been removed`);
  process.exit(1);
}

if (existsSync(outZip)) rmSync(outZip);

const r = spawnSync('zip', ['-rq', outZip, '.'], { cwd: distDir, stdio: 'inherit' });
if (r.status !== 0) {
  console.error(`✗ zip failed with status ${r.status}`);
  process.exit(r.status ?? 1);
}

const size = statSync(outZip).size;
const kb = (size / 1024).toFixed(1);
console.log(`✓ ${outZip} (${kb} KB) — version ${pkg.version}`);
console.log(`  permissions: ${(manifest.permissions ?? []).join(', ')}`);
console.log(`  host_permissions: ${(manifest.host_permissions ?? []).join(', ')}`);
console.log();
console.log(`Next: upload this zip to https://chrome.google.com/webstore/devconsole/`);
