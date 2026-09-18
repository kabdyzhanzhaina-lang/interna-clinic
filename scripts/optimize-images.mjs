// Конвертация фото в WebP с ресайзом: public/images/**/*.jpg → .webp (макс. 1600px, q=78). Оригиналы jpg удаляются,
// кроме OG-картинок (og.jpg, images/og/*) — соцсети надёжнее берут jpg. Запуск: node scripts/optimize-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const ROOT = 'public/images';
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(ROOT).filter((p) => /\.jpe?g$/i.test(p) && !/\/og(\/|\.jpg$)/.test(p));
let before = 0, after = 0;
for (const p of files) {
  const out = p.replace(/\.jpe?g$/i, '.webp');
  const meta = await sharp(p).metadata();
  const max = /\/doctors\//.test(p) ? 900 : 1600;
  before += fs.statSync(p).size;
  await sharp(p).rotate().resize({ width: Math.min(meta.width || max, max), withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(out);
  after += fs.statSync(out).size;
  fs.unlinkSync(p);
}
console.log(`[img] ${files.length} файлов: ${(before / 1048576).toFixed(2)} МБ → ${(after / 1048576).toFixed(2)} МБ`);
