// Миграция контента со старого сайта (Tilda) → src/data/*.json
// Источники: content/site-snapshot/store.xml (каталог), content/sitemap-urls.txt, живые страницы internaclinic.kz (только meta/og и тексты).
// Запуск: node scripts/migrate.mjs [doctors|services|media|all]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const UA = 'Mozilla/5.0 (compatible; InternaMigrate/1.0)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const meta = (html, key) => { const m = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`)); return m ? dec(m[1]) : ''; };
const strip = (h) => dec(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
async function get(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA } });
      if (r.status === 200) { const t = await r.text(); if (!/<title>403<\/title>/.test(t)) return t; }
      await sleep(4000 * (i + 1)); // DDoS-Guard: пауза и повтор
    } catch (e) { await sleep(2000); }
  }
  return '';
}
const translit = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
mkdirSync('content/migrated', { recursive: true });
const store = readFileSync('content/site-snapshot/store.xml', 'utf8');
const storeUrls = [...store.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

/* ───────── ВРАЧИ: 42 карточки каталога → имя, специальность, фото ───────── */
async function doctors() {
  const urls = storeUrls.filter((u) => /\/(interna_team|team)\/tproduct\//.test(u));
  const out = []; const seen = new Set();
  for (const u of urls) {
    const html = await get(u); if (!html) { console.log('skip', u); continue; }
    const og = meta(html, 'og:title'); // «Врач - гастроэнтеролог, гепатолог, Нерсесов Александр Витальевич в Алматы - запись на прием | InternaClinic»
    // имя — последние 2–3 слова с заглавной перед «в Алматы»; роль — всё до имени
    const head = og.split(/\s+в Алматы/)[0];
    const nm = head.match(/((?:[А-ЯЁ][а-яёА-ЯЁ-]+\s+){1,2}[А-ЯЁ][а-яёА-ЯЁ-]+)\s*$/);
    let name = nm ? nm[1].trim() : strip(html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1] || '');
    let role = (nm ? head.slice(0, nm.index) : head).replace(/[,\s-]+$/, '').replace(/^Врач\s*-?\s*/i, '').replace(/,\s*врач\s*-\s*/i, ', ').trim();
    if (!name) { const parts = u.split('/tproduct/')[1].split('-').slice(2); name = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(' '); }
    const id = translit(u.split('/tproduct/')[1].split('-').slice(2).join('-')) || translit(name);
    if (seen.has(id)) continue; seen.add(id);
    const img = meta(html, 'og:image');
    const cat = /гастро|гепат/i.test(role) ? 'gastro' : /эндокрин/i.test(role) ? 'endo' : /эндоскоп/i.test(role) ? 'endoscopy' : /кардио/i.test(role) ? 'cardio' : /детск|педиатр/i.test(role) ? 'kids' : 'other';
    out.push({ id, n: name, r: role.charAt(0).toUpperCase() + role.slice(1), cat, photo: img, src: u });
    process.stdout.write('.'); await sleep(400);
  }
  writeFileSync('content/migrated/doctors.json', JSON.stringify(out, null, 2));
  console.log(`\nврачей: ${out.length}, с фото: ${out.filter((d) => d.photo).length} → content/migrated/doctors.json`);
}

/* ───────── УСЛУГИ: страницы из sitemap → title, description, h1, текст ───────── */
const SKIP = /\/(kaz|oferta|rulse|contacts|contacts_old|about-us|team|teamold|interna_team|media|faq|feedback|price|calculated|taplink|tapacademy|thesis|equip|prepare|salesss|academy|checkup|packet|free|fibrofree|procfree|species|special_expert|consult_dr|endoscopy_menu|ultra_menu|function_dia|service|kids|esg|baloon|interna_cal_team|cal_[a-z]+|endo_cal|fibro_cal|page\d+\.html|.*_kaz|.*-checkup.*)$/;
const DUP = { sonogram: 'ultrasound', gastroenterologist: 'gastroenterolog', endocrynolog: 'endocrinology', fibroscan1: 'fibroscan' };
async function services() {
  const urls = readFileSync('content/sitemap-urls.txt', 'utf8').split('\n').filter((u) => u.trim() && !/internaclinic\.kz\/?$/.test(u) && !SKIP.test(u));
  const out = [];
  for (const u of urls) {
    const slug = u.split('internaclinic.kz/')[1];
    if (DUP[slug]) { out.push({ slug, redirectTo: DUP[slug] }); continue; }
    const html = await get(u); if (!html) { console.log('skip', u); continue; }
    const title = strip(html.match(/<title>(.*?)<\/title>/s)?.[1] || '');
    const description = meta(html, 'description');
    const h1 = strip(html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1] || '');
    // текстовые атомы Zero-блоков и стандартные текстовые блоки
    const body = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
    const blocks = [...body.matchAll(/<div[^>]*class=['"]tn-atom['"][^>]*>([\s\S]*?)<\/div>/g), ...body.matchAll(/<div[^>]*class=['"]t-(?:text|descr|title|heading)[^'"]*['"][^>]*>([\s\S]*?)<\/div>/g)]
      .map((m) => strip(m[1])).filter((t) => t.length > 60 && !/cookie|политик|©|Tilda/i.test(t));
    const uniq = [...new Set(blocks)];
    out.push({ slug, url: u, title, description, h1, paragraphs: uniq, words: uniq.join(' ').split(/\s+/).length });
    process.stdout.write('.'); await sleep(1500);
  }
  writeFileSync('content/migrated/services.json', JSON.stringify(out, null, 2));
  const real = out.filter((s) => !s.redirectTo);
  console.log(`\nстраниц услуг: ${real.length} (+${out.length - real.length} редиректов), слов текста: ${real.reduce((a, s) => a + s.words, 0)} → content/migrated/services.json`);
}

/* ───────── МЕДИАЦЕНТР: посты tpost → og-данные ───────── */
async function media() {
  const feeds = await get('https://internaclinic.kz/sitemap-feeds.xml');
  const feedUrls = [...feeds.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const posts = [];
  for (const f of feedUrls) { const x = await get(f); posts.push(...[...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])); }
  const out = [];
  for (const u of posts) {
    const html = await get(u); if (!html) continue;
    out.push({ id: translit(u.split('/tpost/')[1].split('-').slice(1).join('-')).slice(0, 60), url: u, title: meta(html, 'og:title').replace(/\s*\|\s*Interna Clinic$/, ''), description: meta(html, 'og:description'), image: meta(html, 'og:image'), date: meta(html, 'article:published_time'), video: /youtube\.com|youtu\.be/.test(html) ? (html.match(/https:\/\/(?:www\.)?youtu(?:be\.com\/embed\/|\.be\/)([\w-]+)/)?.[1] || '') : '' });
    process.stdout.write('.'); await sleep(400);
  }
  writeFileSync('content/migrated/media.json', JSON.stringify(out, null, 2));
  console.log(`\nматериалов: ${out.length} → content/migrated/media.json`);
}

const what = process.argv[2] || 'all';
if (what === 'doctors' || what === 'all') await doctors();
if (what === 'services' || what === 'all') await services();
if (what === 'media' || what === 'all') await media();
