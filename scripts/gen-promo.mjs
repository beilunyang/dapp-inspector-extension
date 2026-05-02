// Rasterise docs/store/assets/promo-440x280.svg → docs/store/assets/promo-440x280.png
// for upload to the Chrome Web Store "Small promo tile" field.
//
// Run: pnpm gen:promo
//
// Sharp's underlying librsvg renders <text> against system fonts, so the
// output may shift slightly across machines. Re-run on the machine you'll
// upload from for crispest results.

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'docs/store/assets/promo-440x280.svg');
const OUT = path.join(ROOT, 'docs/store/assets/promo-440x280.png');

const svg = await fs.readFile(SRC);

// density=288 → 2× the natural 144 dpi, gives sharper rasterisation when
// fit:'fill' resamples down to the final 440×280 PNG.
await sharp(svg, { density: 288 })
  .resize(440, 280, { fit: 'fill' })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

const stat = await fs.stat(OUT);
console.log(`✓ ${path.relative(ROOT, OUT)} (${(stat.size / 1024).toFixed(1)} KB, 440×280)`);
