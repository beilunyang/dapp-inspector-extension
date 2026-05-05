// Mirror docs/index.html into docs/en/index.html and docs/zh/index.html.
//
// The landing page is a single self-contained HTML; locale is detected from
// the URL path at runtime (/en/ or /zh/). To get clean per-locale URLs we
// need physical files at those paths — GitHub Pages doesn't rewrite. This
// script just copies the source so all three URLs serve the same bytes; the
// in-page JS reads location.pathname and picks the right strings.
//
// Run after editing docs/index.html:
//   pnpm gen:locales

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SRC  = join(ROOT, 'docs', 'index.html');
const LOCALES = ['en', 'zh'];

let src;
try {
  src = readFileSync(SRC, 'utf8');
} catch (e) {
  console.error(`gen-locales: cannot read ${SRC}: ${e.message}`);
  process.exit(1);
}

const srcMtime = statSync(SRC).mtimeMs;
let updated = 0;
let skipped = 0;

for (const locale of LOCALES) {
  const dir = join(ROOT, 'docs', locale);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, 'index.html');
  let existing = '';
  try { existing = readFileSync(dest, 'utf8'); } catch (_) { /* first run */ }
  if (existing === src) {
    skipped++;
    continue;
  }
  writeFileSync(dest, src);
  updated++;
  console.log(`gen-locales: wrote ${dest.replace(ROOT + '/', '')} (${src.length} bytes)`);
}

if (skipped) console.log(`gen-locales: ${skipped} locale(s) already up to date`);
console.log(`gen-locales: done — source mtime ${new Date(srcMtime).toISOString()}`);
