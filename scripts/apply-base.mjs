// Постобработка сборки: если задан BASE_PATH (GitHub Pages без своего домена),
// префиксует все корневые ссылки/ресурсы в dist/ — href="/…", src="/…", url(/…), content="/…".
// На своём домене (BASE_PATH пуст или '/') ничего не делает.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.env.BASE_PATH || '/').replace(/\/+$/, '');
if (!base) { console.log('[apply-base] BASE_PATH пуст — пропускаем'); process.exit(0); }

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk('dist').filter((f) => /\.(html|css|js|xml|txt)$/.test(f));
let n = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const b = base.slice(1); // без ведущего слэша — чтобы не префиксовать уже префиксованные Astro пути
  const out = src
    .replace(new RegExp(`(href|src|content|action)="/(?!/|${b}/)`, 'g'), `$1="${base}/`)
    .replace(new RegExp(`url\\(/(?!/|${b}/)`, 'g'), `url(${base}/`)
    .replace(/fetch\("\/api\//g, `fetch("${base}/api/`);
  if (out !== src) { writeFileSync(f, out); n++; }
}
console.log(`[apply-base] префикс ${base} применён к ${n} файлам`);
