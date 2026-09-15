/**
 * Генерирует казахские маршруты /kk/** как обёртки над русскими страницами.
 * Шаблоны не дублируются: обёртка рендерит тот же компонент, а перевод текста и префикс ссылок
 * делает scripts/apply-kk.mjs после сборки по словарю src/i18n/kk.json.
 *
 * Запуск: node scripts/make-kk-pages.mjs  (идемпотентно; вызывается из npm run build)
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src/pages', OUT = 'src/pages/kk';
const SKIP = new Set(['404.astro', '[...old].astro']);
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? (p === OUT ? [] : walk(p)) : [p]; });
fs.rmSync(OUT, { recursive: true, force: true });
let n = 0;
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file);
  if (SKIP.has(path.basename(file)) || !file.endsWith('.astro')) continue;
  const src = fs.readFileSync(file, 'utf8');
  const dynamic = /export (async )?function getStaticPaths|export const getStaticPaths/.test(src);
  const out = path.join(OUT, rel);
  const depth = rel.split('/').length; // kk/ + вложенность
  const back = '../'.repeat(depth) + 'pages/' + rel.replace(/\\/g, '/');
  const body = `---
// Автогенерация (scripts/make-kk-pages.mjs): казахская версия страницы ${rel}. Не редактировать вручную.
import Page from '${'../'.repeat(depth)}${rel}';
${dynamic ? `import { getStaticPaths as ruPaths } from '${'../'.repeat(depth)}${rel}';\nexport const getStaticPaths = ruPaths;\n` : ''}---
<Page {...Astro.props} />
`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body); n++;
}
console.log(`[kk] сгенерировано ${n} страниц-обёрток в ${OUT}`);
