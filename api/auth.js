// OAuth для админки (Decap CMS): /api/auth → GitHub → /api/callback.
// Нужны переменные окружения Vercel: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
import { randomBytes } from 'node:crypto';

export default function handler(req, res) {
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id) return res.status(500).send('GITHUB_CLIENT_ID не задан в настройках Vercel');
  const state = randomBytes(16).toString('hex');
  const u = new URL('https://github.com/login/oauth/authorize');
  u.searchParams.set('client_id', id);
  u.searchParams.set('scope', req.query.scope || 'repo');
  u.searchParams.set('state', state);
  res.setHeader('Set-Cookie', `cms_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.redirect(302, u.toString());
}
