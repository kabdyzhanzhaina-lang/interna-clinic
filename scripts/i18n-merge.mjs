/**
 * Сливает партии переводов src/i18n/batches/*.json в основной словарь src/i18n/kk.json.
 * Запуск: node scripts/i18n-merge.mjs
 */
import fs from 'node:fs';
const dictPath = 'src/i18n/kk.json';
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
let added = 0, files = 0;
for (const f of fs.readdirSync('src/i18n/batches').filter((x) => x.endsWith('.json')).sort()) {
  let part;
  try { part = JSON.parse(fs.readFileSync(`src/i18n/batches/${f}`, 'utf8')); } catch (e) { console.error(`✗ ${f}: ${e.message}`); process.exitCode = 1; continue; }
  for (const [k, v] of Object.entries(part)) { const key = k.replace(/\s+/g, ' ').trim(); if (!dict[key]) added++; dict[key] = v; }
  files++;
}
fs.writeFileSync(dictPath, JSON.stringify(dict, null, 1) + '\n');
console.log(`[i18n] партий ${files}, новых записей ${added}, всего ${Object.keys(dict).length}`);
