/**
 * Локальный API админки (только `npm run dev`): читает и пишет файлы сайта вместо GitHub.
 * На продакшене админка ходит в GitHub API напрямую, этот модуль в сборку не попадает.
 *
 *   GET  /__admin/file?path=…[&ref=sha]  → содержимое файла (из рабочей копии или из коммита)
 *   POST /__admin/commit {files:[{path, content, encoding}]} → запись файлов
 *   GET  /__admin/history                 → последние коммиты с правками данных
 *   GET  /__admin/commit-files?sha=…       → файлы коммита и его родитель
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const ALLOWED = /^(src\/data\/[\w.-]+\.json|src\/i18n\/[\w.-]+\.json|vercel\.json|public\/images\/[\w/.-]+\.(webp|png|jpe?g|svg))$/;
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 << 20 });

const send = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};
const readBody = (req) => new Promise((ok, fail) => {
  // склеиваем байты и декодируем один раз: иначе буква, разрезанная между кусками, превращается в «��»
  const parts = [];
  req.on('data', (c) => parts.push(c));
  req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { fail(e); } });
  req.on('error', fail);
});

export default function adminDevApi() {
  return {
    name: 'admin-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__admin', async (req, res) => {
        try {
          const u = new URL(req.url, 'http://x');
          if (req.method === 'GET' && u.pathname === '/file') {
            const p = u.searchParams.get('path') || '';
            const ref = u.searchParams.get('ref');
            if (!ALLOWED.test(p)) return send(res, 400, { error: 'path' });
            if (ref) {
              try { return send(res, 200, { content: git('show', `${ref}:${p}`) }); } catch { return send(res, 404, { error: 'not found' }); }
            }
            const f = path.join(ROOT, p);
            if (!fs.existsSync(f)) return send(res, 404, { error: 'not found' });
            return send(res, 200, { content: fs.readFileSync(f, 'utf8') });
          }
          if (req.method === 'POST' && u.pathname === '/commit') {
            const { files = [] } = await readBody(req);
            if (!files.length || files.some((f) => !ALLOWED.test(f.path))) return send(res, 400, { error: 'path' });
            for (const f of files) {
              const dst = path.join(ROOT, f.path);
              if (f.delete) { if (fs.existsSync(dst)) fs.unlinkSync(dst); continue; } // фото, на которое больше никто не ссылается
              fs.mkdirSync(path.dirname(dst), { recursive: true });
              fs.writeFileSync(dst, f.encoding === 'base64' ? Buffer.from(f.content, 'base64') : f.content);
            }
            return send(res, 200, { ok: true, sha: null });
          }
          if (req.method === 'GET' && u.pathname === '/history') {
            const out = git('log', '-n', '30', '--format=%H%x1f%an%x1f%aI%x1f%s', '--', 'src/data', 'src/i18n', 'public/images');
            const items = out.trim().split('\n').filter(Boolean).map((l) => { const [sha, author, date, message] = l.split('\x1f'); return { sha, author, date, message }; });
            return send(res, 200, { items });
          }
          if (req.method === 'GET' && u.pathname === '/commit-files') {
            const sha = u.searchParams.get('sha') || '';
            if (!/^[0-9a-f]{7,40}$/.test(sha)) return send(res, 400, { error: 'sha' });
            const files = git('show', '--name-only', '--format=', sha).trim().split('\n').filter((p) => ALLOWED.test(p));
            let parent = null;
            try { parent = git('rev-parse', `${sha}^`).trim(); } catch {}
            return send(res, 200, { files, parent });
          }
          send(res, 404, { error: 'unknown' });
        } catch (e) {
          send(res, 500, { error: String(e.message || e) });
        }
      });
    },
  };
}
