/**
 * Полный перенос медиацентра со старого сайта (Tilda) → src/data/media.json
 *
 *  Статьи (3):  content/site-snapshot/posts/<id>.html — полный текст из редактора Tilda
 *               (h2 / h3 / абзацы / списки), дата — из content/migrated/feed-articles.json
 *  Видео (10):  текст на старом сайте отсутствует (только ролик), поэтому описание, тайм-коды,
 *               длительность и дату берём из content/migrated/yt/<videoId>.json (страницы YouTube)
 *
 * Запуск: node scripts/migrate-articles.mjs
 */
import fs from 'node:fs';

const R = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const src = R('content/migrated/media.json');          // id, url, title, description, image, video
const feedA = R('content/migrated/feed-articles.json').posts;
const feedV = R('content/migrated/feed-video.json').posts;
const prev = R('src/data/media.json').items || R('src/data/media.json');                 // чтобы сохранить пути картинок

const clean = (h) => h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const words = (body) => body.reduce((n, b) => n + (Array.isArray(b[1]) ? b[1].join(' ') : String(b[1])).split(/\s+/).length, 0);

/* ───────── статьи: HTML редактора Tilda → body ───────── */
function parseArticle(html) {
  const i = html.indexOf('js-feed-post-text'); const j = html.indexOf('</section>', i);
  // списки и заголовки часто лежат внутри текстового div — выносим их на отдельные строки, иначе они склеятся в абзац
  let blk = html.slice(i, j).replace(/<div class="t-redactor__text">/g, '\n@@P@@').replace(/<\/div>/g, '\n').replace(/<(ul|ol|h2|h3)\b/g, '\n<$1').replace(/<\/(ul|ol|h2|h3)>/g, '</$1>\n@@P@@');
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>|<h3[^>]*>([\s\S]*?)<\/h3>|<ul>([\s\S]*?)<\/ul>|<ol>([\s\S]*?)<\/ol>|@@P@@([^\n]*)/g;
  const body = []; let m;
  while ((m = re.exec(blk))) {
    if (m[1] != null) body.push(['h', clean(m[1])]);
    else if (m[2] != null) body.push(['h3', clean(m[2])]);
    else if (m[3] != null || m[4] != null) body.push([m[3] != null ? 'ul' : 'ol', [...(m[3] ?? m[4]).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => clean(x[1])).filter(Boolean)]);
    else if (m[5] != null) { const t = clean(m[5]); if (t) body.push(['p', t]); }
  }
  return body.filter((b) => (Array.isArray(b[1]) ? b[1].length : b[1]));
}

/* ───────── видео: описание YouTube → body (абзацы, списки, тайм-коды) ───────── */
const SKIP = /instagram|инстаграм|^#|^ссылка на|подписывайтесь|^credits|^music:|^link to video|промокод|internamed\.kz|не забудьте поставить лайк|^наш следующий гость/i;
function parseDesc(desc) {
  const lines = desc.split('\n').map((l) => l.trim());
  const body = []; let list = null, tc = null, skipBlock = false;
  const flush = () => { if (list) { body.push(['ul', list]); list = null; } if (tc) { body.push(['tc', tc]); tc = null; } };
  for (const l of lines) {
    if (!l) { flush(); skipBlock = false; continue; }
    if (/^КОНКУРС/i.test(l)) { skipBlock = true; continue; }     // устаревший конкурс 2024 года
    if (skipBlock || SKIP.test(l)) continue;
    const t = l.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)$/);
    if (t) { if (list) { body.push(['ul', list]); list = null; } (tc ??= []).push([t[1], t[2].replace(/^[-–—]\s*/, '')]); continue; }
    if (/^[-–—•]\s*/.test(l)) { if (tc) { body.push(['tc', tc]); tc = null; } (list ??= []).push(l.replace(/^[-–—•]\s*/, '')); continue; }
    // «Имя Отчество – должность» подряд → список участников
    if (/^[А-ЯЁ][а-яё]+ [А-ЯЁ][а-яё]+ [А-ЯЁ][а-яё]+\s+[-–—]\s+/.test(l)) { (list ??= []).push(l); continue; }
    flush();
    if (/:$/.test(l) && l.length < 40) body.push(['h3', l.replace(/:$/, '')]);
    else body.push(['p', l]);
  }
  flush();
  // заголовок «Тайм-коды:» перед списком тайм-кодов лишний — у блока есть свой
  return body.filter((b, i) => !(b[0] === 'h3' && body[i + 1]?.[0] === 'tc'));
}

const ytIdFromImage = (u) => (u.match(/vi\/([\w-]{11})\//) || [])[1];
const PODCAST = /о казахстанской медицине/i;
const EVENING = /вечерн/i;
const GUEST_DOC = [[/раисов/i, 'raisova'], [/нерсесов/i, 'nersesov']];
const CAT = (title) => (/инсулин|диабет|эндокрин/i.test(title) ? 'ЭНДОКРИНОЛОГИЯ' : 'ГАСТРОЭНТЕРОЛОГИЯ');

const out = src.map((s) => {
  const p = prev.find((x) => x.id === s.id) || {};
  const fa = feedA.find((f) => f.url === s.url); const fv = feedV.find((f) => f.url === s.url);
  const base = { id: s.id, t: s.title, img: p.img || `media/${s.id}`, doc: null, video: '', url: s.url };

  if (fa) { // статья
    const html = fs.readFileSync(`content/site-snapshot/posts/${s.id}.html`, 'utf8');
    const body = parseArticle(html);
    return { ...base, tag: `СТАТЬЯ · ${CAT(s.title)}`, by: 'Медиацентр Interna Clinic', date: fa.date.slice(0, 10), min: `${Math.max(3, Math.round(words(body) / 170))} мин чтения`, body };
  }
  // видео / подкаст
  const vid = s.video || ytIdFromImage(fv?.image || '');
  const yt = fs.existsSync(`content/migrated/yt/${vid}.json`) ? R(`content/migrated/yt/${vid}.json`) : null;
  const isPod = PODCAST.test(s.title), isEve = yt && EVENING.test(yt.desc);
  const doc = (GUEST_DOC.find(([re]) => re.test(s.title)) || [])[1] || null;
  const body = yt ? parseDesc(yt.desc) : [['p', s.description || '']];
  if (yt && !isPod && yt.title && clean(yt.title) !== s.title) body.unshift(['p', clean(yt.title).replace(/\.$/, '') + '.']);
  const title = isPod || !yt ? s.title : clean(yt.title).replace(/\.$/, '');
  return { ...base, t: title, doc, video: vid, tag: isPod ? 'ПОДКАСТ · О КАЗАХСТАНСКОЙ МЕДИЦИНЕ' : isEve ? 'ВИДЕО · ВЕЧЕРНЯЯ INTERNA' : 'ВИДЕО · МЕДИАЦЕНТР',
    by: isPod ? 'Interna Подкаст' : 'Interna Clinic · YouTube', date: yt?.pub || fv?.date?.slice(0, 10) || '', min: yt?.len ? `${Math.round(yt.len / 60)} мин видео` : 'видео', body };
});

out.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync('src/data/media.json', JSON.stringify({ items: out }, null, 1) + '\n');
for (const o of out) console.log(`${o.date}  ${o.min.padEnd(16)} ${String(words(o.body)).padStart(5)} слов  ${o.t.slice(0, 60)}`);
