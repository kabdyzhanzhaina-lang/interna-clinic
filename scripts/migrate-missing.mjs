// Повторная выкачка страниц услуг, которые получили заглушку DDoS-Guard (403). Медленно, с паузами.
import { readFileSync, writeFileSync } from 'node:fs';
const all = JSON.parse(readFileSync('content/migrated/services.json', 'utf8'));
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const strip = (h) => dec(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const meta = (html, key) => { const m = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`)); return m ? dec(m[1]) : ''; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const s of all) {
  if (s.redirectTo || s.words >= 100) continue;
  let html = '';
  for (let i = 0; i < 6 && !html; i++) {
    await sleep(6000 + i * 4000);
    try { const r = await fetch(s.url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140 Safari/537.36', 'accept-language': 'ru' } }); const t = await r.text(); if (r.status === 200 && !/<title>403<\/title>/.test(t)) html = t; } catch {}
  }
  if (!html) { console.log('still blocked:', s.slug); continue; }
  const body = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const blocks = [...body.matchAll(/<div[^>]*class=['"]tn-atom['"][^>]*>([\s\S]*?)<\/div>/g), ...body.matchAll(/<div[^>]*class=['"]t-(?:text|descr|title|heading)[^'"]*['"][^>]*>([\s\S]*?)<\/div>/g)].map((m) => strip(m[1])).filter((t) => t.length > 60 && !/cookie|политик|©|Tilda/i.test(t));
  s.title = strip(html.match(/<title>(.*?)<\/title>/s)?.[1] || s.title); s.description = meta(html, 'description') || s.description; s.h1 = strip(html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1] || '') || s.h1;
  s.paragraphs = [...new Set(blocks)]; s.words = s.paragraphs.join(' ').split(/\s+/).length;
  console.log('ok:', s.slug, s.words, 'слов');
  writeFileSync('content/migrated/services.json', JSON.stringify(all, null, 2));
}
console.log('done');
