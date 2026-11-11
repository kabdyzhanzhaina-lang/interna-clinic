// Отдаёт папку review-site по сети: отдельный набор страниц для проверки клиентом.
// node scripts/serve-review.mjs [порт]   →   http://<ip-мака>:4400/
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = new URL('../review-site', import.meta.url).pathname;
const PORT = Number(process.argv[2] || process.env.PORT || 4400);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml', '.ico': 'image/x-icon' };

const send = (res, file, code = 200) => {
  res.writeHead(code, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  createReadStream(file).pipe(res);
};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.includes('..')) return send(res, join(ROOT, '404.html'), 404);
  const candidates = [p, p.replace(/\/$/, '') + '/index.html', p + '.html'].map((c) => join(ROOT, normalize(c)));
  const file = candidates.find((f) => existsSync(f) && statSync(f).isFile());
  if (file) return send(res, file);
  send(res, join(ROOT, '404.html'), 404);
}).listen(PORT, '0.0.0.0', () => console.log(`review-site → http://0.0.0.0:${PORT}/`));
