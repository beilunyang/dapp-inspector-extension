// Rasterise every SVG in docs/store/assets/ to a sibling PNG at the
// dimensions encoded in the file name (e.g. promo-440x280.svg →
// promo-440x280.png at 440×280, hero-1280x800.svg → hero-1280x800.png
// at 1280×800).
//
// Run: pnpm gen:promo
//
// Sharp's underlying librsvg renders <text> against system fonts, so
// the output may shift slightly across machines. Re-run on the machine
// you'll upload from for the crispest output.

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'docs/store/assets');

const entries = await fs.readdir(ASSETS);
const targets = entries.filter((f) => f.endsWith('.svg') && /-\d+x\d+\.svg$/.test(f));

if (targets.length === 0) {
  console.error('✗ no <name>-WIDTHxHEIGHT.svg files found in docs/store/assets/');
  process.exit(1);
}

for (const name of targets) {
  const m = /-(\d+)x(\d+)\.svg$/.exec(name);
  if (!m) continue;
  const width = Number(m[1]);
  const height = Number(m[2]);
  const src = path.join(ASSETS, name);
  const out = path.join(ASSETS, name.replace(/\.svg$/, '.png'));
  const svg = await fs.readFile(src);

  // 2× density gives crisp downsampling when fit:'fill' resamples to
  // the final exact pixel dimensions.
  await sharp(svg, { density: 288 })
    .resize(width, height, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(out);

  const size = (await fs.stat(out)).size;
  console.log(`✓ ${path.relative(ROOT, out)} (${(size / 1024).toFixed(1)} KB, ${width}×${height})`);
}
