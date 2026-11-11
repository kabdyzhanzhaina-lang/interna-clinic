// Обмен кода GitHub на токен и передача его в окно админки (протокол Decap CMS: postMessage).
export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookie = (req.headers.cookie || '').match(/(?:^|;\s*)cms_state=([a-f0-9]+)/);
  let msg;
  if (!code || !state || !cookie || cookie[1] !== state) {
    msg = 'error:' + JSON.stringify({ error: 'Сессия входа устарела, попробуйте ещё раз' });
  } else {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
    });
    const d = await r.json();
    msg = d.access_token ? 'success:' + JSON.stringify({ token: d.access_token, provider: 'github' }) : 'error:' + JSON.stringify(d);
  }
  const payload = JSON.stringify('authorization:github:' + msg).replace(/</g, '\\u003c');
  res.setHeader('Set-Cookie', 'cms_state=; Path=/api; Max-Age=0');
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><meta charset="utf-8"><p>Вход…</p><script>
(function () {
  var origin = location.origin;
  function send(e) {
    if (e.origin !== origin) return;
    window.opener.postMessage(${payload}, origin);
    window.removeEventListener('message', send);
    window.close();
  }
  window.addEventListener('message', send, false);
  window.opener.postMessage('authorizing:github', origin);
})();
</script>`);
}
