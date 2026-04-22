// Rasterize public/icons/icon.svg into 16/32/48/128 PNGs.
// Run: pnpm gen:icons
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public/icons/icon.svg');
const OUT_DIR = path.join(ROOT, 'public/icons');
const SIZES = [16, 32, 48, 128];

const svg = await fs.readFile(SRC);

for (const size of SIZES) {
  const out = path.join(OUT_DIR, `${size}.png`);
  await sharp(svg, { density: Math.max(72, size * 4) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const { size: bytes } = await fs.stat(out);
  console.log(`  ${size}x${size} → ${path.relative(ROOT, out)} (${bytes} B)`);
}
