/* Демо платформы Interna Academy: маршрутизация по хешу, вход через WhatsApp, оплата, кабинет, уроки */
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const layer = $('#layer');

const I = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></svg>',
  cert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 9h10M7 12.5h6"/><path d="m15 17-1 5 3-1.5L20 22l-1-5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  hist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h10l3 3v15H4V3h3Z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="14" height="14" rx="2.5"/><path d="m16.5 10 5-3v10l-5-3"/></svg>',
  case: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3h6v4H9zM5 7h14v14H5z"/><path d="M12 11v6M9 14h6"/></svg>',
};

/* ---------- Состояние (localStorage — только удобство для демо) ---------- */
const KEY = 'interna-academy-demo-v1';
const blank = () => ({ user: null, owned: [], progress: {}, orders: [] });
let S = blank();
try { S = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

const byId = id => COURSES.find(c => c.id === +id);
const sp = id => SPEAKERS.find(s => s.id === id);
const money = n => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸';
const owns = id => S.owned.includes(+id);
const lessons = c => [...program(c).filter(t => t !== 'Итоговое тестирование'), 'Итоговое тестирование'];
const done = c => (S.progress[c.id] || 0) >= lessons(c).length;
const initials = n => n.split(' ').slice(0, 2).map(w => w[0]).join('');
const today = () => new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

/* ---------- Общие блоки ---------- */
const card = c => `
  <a class="card" href="#/course/${c.id}">
    <div class="pic"><img src="${c.img}" alt="" loading="lazy">${owns(c.id) ? '<span class="tag own">Курс у вас</span>' : c.f === 'live' ? `<span class="tag live"><i class="dot"></i>Эфир · ${c.date}</span>` : c.top ? '<span class="tag">Популярный</span>' : ''}</div>
    <div class="bd">
      <div class="meta"><span>${c.s}</span></div>
      <h3>${c.t}</h3>
      <div class="meta"><span>${I.clock}${c.h} ч</span><span>${I.award}${c.ze} ЗЕ</span>${c.kz ? '<span>Қазақша</span>' : ''}</div>
      <div class="ft"><span class="price">${money(c.price)}</span><span class="go">${I.arrow}</span></div>
    </div>
  </a>`;

const header = () => {
  $('#hbtn').innerHTML = S.user
    ? `<a class="btn line" href="#/cabinet">${I.book}<span>Мои курсы</span></a><a class="avatar" href="#/cabinet/profile" title="${esc(S.user.name)}">${initials(S.user.name)}</a>`
    : `<button class="btn wa" id="loginBtn">${I.wa}<span>Войти</span></button>`;
  const b = $('#loginBtn');
  if (b) b.onclick = () => openLogin();
};

/* ---------- Главная ---------- */
function home() {
  const live = COURSES.filter(c => c.f === 'live');
  const top = COURSES.filter(c => c.top && c.f === 'rec').concat(COURSES.filter(c => !c.top && c.f === 'rec')).slice(0, 8);
  const cnt = s => COURSES.filter(c => c.s === s).length;
  app.innerHTML = `
  <section class="hero">
    <div class="w">
      <div>
        <div class="kick">Interna Academy · обучение для врачей</div>
        <h1>Повышение квалификации <em>онлайн</em> — с сертификатом и ЗЕ</h1>
        <p>Курсы от практикующих врачей и профессоров КазНМУ. Вход по номеру телефона через WhatsApp, оплата картой или Kaspi Pay, доступ — сразу.</p>
        <div class="cta">
          <a class="btn red" href="#/catalog">Выбрать курс ${I.arrow}</a>
          <a class="btn ghost" href="#/course/35">${I.play} Смотреть вводную лекцию</a>
        </div>
        <div class="stats">
          <div><b>${COURSES.length}</b><span>курса в каталоге</span></div>
          <div><b>${SPECS.length}</b><span>направлений</span></div>
          <div><b>до 18</b><span>ЗЕ за курс</span></div>
        </div>
      </div>
      <div class="fan">
        <img src="img/course33.webp" alt="">
        <img src="img/course35.webp" alt="">
        <img src="img/course25.webp" alt="">
        <div class="livebadge"><i class="dot"></i><div><b>Ближайший эфир — 21 ноября</b>Менеджмент МАЖБП 2</div></div>
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="w">
      <div class="head">
        <div><div class="kick">Расписание</div><h2>Ближайшие онлайн-эфиры</h2><p class="lead">Задавайте вопросы спикерам в прямом эфире. Запись остаётся в кабинете — можно пересмотреть.</p></div>
        <a class="more" href="#/catalog?f=live">Все эфиры</a>
      </div>
      <div class="lives">
        ${live.slice(0, 3).map(c => `
          <a class="lv" href="#/course/${c.id}">
            <img src="${c.img}" alt="" loading="lazy">
            <div>
              <span class="d">${I.cal} ${c.date}</span>
              <h3>${c.t}</h3>
              <div class="meta"><span>${I.clock}${c.h} ч</span><span>${I.award}${c.ze} ЗЕ</span></div>
            </div>
          </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="sec soft">
    <div class="w">
      <div class="head"><div><div class="kick">Направления</div><h2>Найдите курс по своей специальности</h2></div></div>
      <div class="specs">
        ${SPECS.map(s => `<a class="sp" href="#/catalog?s=${encodeURIComponent(s)}">${s}<span>${cnt(s)} ${cnt(s) === 1 ? 'курс' : cnt(s) < 5 ? 'курса' : 'курсов'}</span></a>`).join('')}
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="w">
      <div class="head"><div><div class="kick">Как это работает</div><h2>Четыре шага — и вы учитесь</h2><p class="lead">Без паролей и писем на почту. Всё работает с телефона.</p></div></div>
      <div class="steps">
        <div class="step"><div class="ic wa">${I.wa}</div><h3>Вход через WhatsApp</h3><p>Введите номер — код придёт в WhatsApp. Пароль не нужен.</p></div>
        <div class="step"><div class="ic">${I.book}</div><h3>Выбор курса</h3><p>Посмотрите программу, спикеров и бесплатную вводную лекцию.</p></div>
        <div class="step"><div class="ic">${I.card}</div><h3>Оплата</h3><p>Картой или через Kaspi Pay — доступ открывается сразу.</p></div>
        <div class="step"><div class="ic">${I.cert}</div><h3>Сертификат с ЗЕ</h3><p>После итогового теста сертификат появится в кабинете.</p></div>
      </div>
    </div>
  </section>

  <section class="sec soft">
    <div class="w">
      <div class="head">
        <div><div class="kick">В записи</div><h2>Популярные курсы</h2><p class="lead">Смотрите в удобное время — доступ 5 месяцев, лекции можно пересматривать.</p></div>
        <a class="more" href="#/catalog?f=rec">Весь каталог</a>
      </div>
      <div class="grid">${top.map(card).join('')}</div>
    </div>
  </section>

  <section class="sec" id="speakers">
    <div class="w">
      <div class="head"><div><div class="kick">Спикеры</div><h2>Преподают практикующие врачи</h2><p class="lead">Профессора и доценты КазНМУ им. С.Д. Асфендиярова, врачи Interna Clinic.</p></div></div>
      <div class="spk">
        ${SPEAKERS.map((s, i) => `<div class="pr"><div class="ph"><img src="img/sp${i + 1}.webp" alt="${esc(s.name)}" loading="lazy"></div><h3>${s.name}</h3><p>${s.role}</p></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="sec soft">
    <div class="w">
      <div class="head"><div><div class="kick">Выгоднее пакетом</div><h2>Пакеты курсов</h2><p class="lead">Выберите курсы сами — скидка применится автоматически.</p></div></div>
      <div class="packs">
        <div class="pk">
          <h3>Один курс</h3>
          <div class="sum">25 000 ₸</div>
          <ul><li>${I.check}Доступ 5 месяцев</li><li>${I.check}Сертификат с ЗЕ</li><li>${I.check}Материалы и тесты</li></ul>
          <a class="btn line" href="#/catalog">Выбрать курс</a>
        </div>
        <div class="pk best">
          <span class="ribbon">ВЫГОДНО</span>
          <h3>Пакет из 3 курсов</h3>
          <div class="sum">60 000 ₸</div><div class="old">75 000 ₸</div>
          <ul><li>${I.check}Экономия 15 000 ₸</li><li>${I.check}Любые 3 курса из каталога</li><li>${I.check}Оплата частями через Kaspi</li></ul>
          <a class="btn red" href="#/catalog">Собрать пакет</a>
        </div>
        <div class="pk">
          <h3>Пакет из 6 курсов</h3>
          <div class="sum">105 000 ₸</div><div class="old">150 000 ₸</div>
          <ul><li>${I.check}Экономия 45 000 ₸</li><li>${I.check}Набор ЗЕ на год вперёд</li><li>${I.check}Приоритетная поддержка</li></ul>
          <a class="btn line" href="#/catalog">Собрать пакет</a>
        </div>
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="w acc">
      <div>
        <div class="kick">Сертификат</div>
        <h2>Зачётные единицы засчитываются при аттестации</h2>
        <ul class="ticks">
          <li>${I.check}Сертификат с часами и ЗЕ — сразу после итогового теста</li>
          <li>${I.check}Все сертификаты хранятся в личном кабинете</li>
          <li>${I.check}Скачивание в PDF и проверка по QR-коду</li>
          <li>${I.check}История обучения и оплат — в одном месте</li>
        </ul>
      </div>
      <div class="cert">
        <div class="lg"></div>
        <div class="ttl">Сертификат</div>
        <div class="nm">Иванова Алия Сериковна</div>
        <div class="cr">за успешное прохождение курса «Современная панкреатология: диагностика, осложнения и междисциплинарное ведение»</div>
        <div class="bt"><div class="ze">13 ЗЕ<small>26 академических часов</small></div><div class="qr"></div></div>
      </div>
    </div>
  </section>

  <section class="sec soft" id="faq">
    <div class="w">
      <div class="head"><div><div class="kick">Вопросы</div><h2>Частые вопросы</h2></div></div>
      <div class="faq">${FAQ.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
    </div>
  </section>`;
}

/* ---------- Каталог ---------- */
function catalog(q) {
  const st = { s: q.get('s') || '', f: q.get('f') || '', q: q.get('q') || '' };
  app.innerHTML = `
  <section class="pagehead">
    <div class="w">
      <div class="crumbs"><a href="#/">Главная</a> / Каталог</div>
      <h1>Каталог курсов</h1>
      <div class="filters">
        <label class="search">${I.search}<input id="q" type="search" placeholder="Название курса или тема" value="${esc(st.q)}" aria-label="Поиск по курсам"></label>
        <div class="chips" id="fmt">
          <button class="chip" data-f="">Все форматы</button>
          <button class="chip" data-f="live"><i class="dot" style="width:8px;height:8px;animation:none"></i>Онлайн-эфиры</button>
          <button class="chip" data-f="rec">В записи</button>
        </div>
        <div class="chips" id="spc">
          <button class="chip" data-s="">Все направления</button>
          ${SPECS.map(s => `<button class="chip" data-s="${s}">${s} <small>${COURSES.filter(c => c.s === s).length}</small></button>`).join('')}
        </div>
      </div>
    </div>
  </section>
  <section class="w" style="padding-bottom:96px"><div class="found" id="found"></div><div class="grid" id="list"></div></section>`;

  const draw = () => {
    const words = st.q.toLowerCase().trim();
    const list = COURSES.filter(c => (!st.s || c.s === st.s) && (!st.f || c.f === st.f) && (!words || (c.t + ' ' + c.s).toLowerCase().includes(words)));
    $('#list').innerHTML = list.map(card).join('');
    $('#found').textContent = list.length ? `Найдено курсов: ${list.length}` : '';
    if (!list.length) $('#list').innerHTML = '<div class="empty" style="grid-column:1/-1">Ничего не нашлось. Попробуйте другое слово или сбросьте фильтры.</div>';
    document.querySelectorAll('#fmt .chip').forEach(b => b.classList.toggle('on', b.dataset.f === st.f));
    document.querySelectorAll('#spc .chip').forEach(b => b.classList.toggle('on', b.dataset.s === st.s));
    const p = new URLSearchParams(Object.entries(st).filter(([, v]) => v)).toString();
    history.replaceState(null, '', '#/catalog' + (p ? '?' + p : ''));
  };
  $('#fmt').onclick = e => { const b = e.target.closest('.chip'); if (b) { st.f = b.dataset.f; draw(); } };
  $('#spc').onclick = e => { const b = e.target.closest('.chip'); if (b) { st.s = b.dataset.s; draw(); } };
  $('#q').oninput = e => { st.q = e.target.value; draw(); };
  draw();
}

/* ---------- Плеер-заглушка ---------- */
function bindPlayer(el, total = '42:10') {
  if (!el) return;
  let t = 0, timer;
  el.onclick = () => {
    if (el.classList.contains('playing')) { el.classList.remove('playing'); clearInterval(timer); return; }
    el.classList.add('playing');
    timer = setInterval(() => {
      t = (t + 0.5) % 100;
      $('.bar i', el).style.width = t + '%';
      const sec = Math.round(t * 25.3);
      $('.cap .tm', el).textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')} / ${total}`;
      if (!document.body.contains(el)) clearInterval(timer);
    }, 250);
  };
}
const player = (img, title, total = '42:10') => `
  <div class="player" id="player">
    <img src="${img}" alt="">
    <div class="pb">${I.play}</div>
    <div class="cap"><span>${title}</span><span class="tm">00:00 / ${total}</span></div>
    <div class="bar"><i></i></div>
  </div>`;

/* ---------- Страница курса ---------- */
function course(id) {
  const c = byId(id);
  if (!c) return notFound();
  const mine = owns(c.id);
  const ls = lessons(c);
  const banner = c.id === 35 ? 'img/hero35.webp' : c.img;
  const buyBtns = mine
    ? `<a class="btn red full" href="#/learn/${c.id}">${done(c) ? 'Открыть курс' : 'Продолжить обучение'} ${I.arrow}</a>`
    : `<button class="btn red full" data-buy>${c.f === 'live' ? 'Записаться на эфир' : 'Купить курс'}</button><button class="btn line full" data-preview>${I.play} Вводная лекция бесплатно</button>`;
  app.innerHTML = `
  <div class="page-course">
  <section class="chero">
    <div class="w">
      <div>
        <div class="crumbs"><a href="#/">Главная</a> / <a href="#/catalog">Каталог</a> / <a href="#/catalog?s=${encodeURIComponent(c.s)}">${c.s}</a></div>
        <h1>${c.t}</h1>
        <div class="pills">
          ${c.f === 'live' ? `<span class="r"><i class="dot" style="width:8px;height:8px;background:#fff;animation:none"></i>Онлайн-эфир · ${c.date}</span>` : '<span>Курс в записи</span>'}
          <span>${c.h} академических часов</span><span>${c.ze} ЗЕ</span><span>Доступ 5 месяцев</span>
        </div>
        ${player(banner, 'Вводная лекция · бесплатно', '12:40')}
      </div>
      <aside class="buy">
        <div class="pic"><img src="${c.img}" alt=""></div>
        ${mine ? `<div class="price" style="color:var(--ok);font-size:26px">Курс у вас</div><div class="note">Пройдено ${Math.min(S.progress[c.id] || 0, ls.length)} из ${ls.length} уроков</div>` : `<div class="price">${money(c.price)}</div><div class="note">или 60 000 ₸ в пакете из 3 курсов</div>`}
        ${buyBtns}
        <ul>
          <li>${I.award}Сертификат с ${c.ze} ЗЕ</li>
          <li>${I.clock}${c.h} часов: лекции, разборы, тест</li>
          <li>${I.phone}Удобно смотреть с телефона</li>
          <li>${I.card}Картой или Kaspi Pay</li>
        </ul>
      </aside>
    </div>
  </section>
  <section class="sec">
    <div class="w cbody">
      <div>
        <div class="kick">О курсе</div>
        <h2>Чему вы научитесь</h2>
        <div class="learn">
          <div>${I.check}Разбирать сложные случаи по современным клиническим рекомендациям</div>
          <div>${I.check}Выстраивать маршрут пациента и тактику ведения</div>
          <div>${I.check}Избегать типичных ошибок в диагностике и терапии</div>
          <div>${I.check}Работать в мультидисциплинарной команде</div>
        </div>
        <h2 style="margin-top:72px">Программа курса</h2>
        <div class="mods">
          ${ls.map((t, i) => `<div class="m${i === 0 ? ' free' : ''}"><b>${i + 1}. ${t}</b><span>${i === 0 ? `${I.play} Бесплатно` : mine ? `${I.check} Доступно` : `${I.lock} После оплаты`}</span></div>`).join('')}
        </div>
        <h2 style="margin-top:72px">Спикеры курса</h2>
        <div class="srow">
          ${c.sp.map(n => `<div class="sc"><img src="img/sp${n}.webp" alt="" loading="lazy"><div><b>${sp(n).name}</b><span>${sp(n).role}</span></div></div>`).join('')}
        </div>
      </div>
      <div>
        <div class="cert" style="position:sticky;top:104px">
          <div class="lg"></div>
          <div class="ttl">Вы получите</div>
          <div class="nm" style="font-size:24px">Сертификат с ЗЕ</div>
          <div class="cr">Появится в личном кабинете сразу после итогового теста. Скачивается в PDF.</div>
          <div class="bt"><div class="ze">${c.ze} ЗЕ<small>${c.h} академических часов</small></div><div class="qr"></div></div>
        </div>
      </div>
    </div>
  </section>
  </div>
  <div class="mbuy">${mine ? `<a class="btn red" href="#/learn/${c.id}">Продолжить обучение</a>` : `<span class="price">${money(c.price)}</span><button class="btn red" data-buy>${c.f === 'live' ? 'Записаться' : 'Купить курс'}</button>`}</div>`;
  bindPlayer($('#player'), '12:40');
  document.querySelectorAll('[data-buy]').forEach(b => (b.onclick = () => openPay(c)));
  const pv = $('[data-preview]');
  if (pv) pv.onclick = () => { $('#player').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#player').click(), 400); };
}

/* ---------- Модальные окна ---------- */
function modal(html, cls = '') {
  layer.innerHTML = `<div class="ov"><div class="modal ${cls}" role="dialog" aria-modal="true"><button class="x" aria-label="Закрыть">×</button><div id="mb">${html}</div></div></div>`;
  const close = () => (layer.innerHTML = '');
  $('.x', layer).onclick = close;
  $('.ov', layer).onclick = e => { if (e.target.classList.contains('ov')) close(); };
  return { body: $('#mb', layer), close, set: h => ($('#mb', layer).innerHTML = h) };
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') layer.innerHTML = ''; });

function toast(html, ms = 7000) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = html;
  document.body.appendChild(t);
  t.onclick = () => t.remove();
  setTimeout(() => t.remove(), ms);
}
function snack(text) {
  document.querySelectorAll('.snack').forEach(s => s.remove());
  const s = document.createElement('div');
  s.className = 'snack';
  s.textContent = text;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 3200);
}

/* ---------- Вход через WhatsApp ---------- */
const CODE = '4815';
function openLogin(after) {
  const m = modal('');
  const stepPhone = () => {
    m.set(`
      <h2>Вход на платформу</h2>
      <p class="sub">Введите номер — пришлём код в WhatsApp. Пароль не нужен.</p>
      <label class="f" for="ph">Номер телефона</label>
      <input class="inp" id="ph" type="tel" inputmode="tel" value="+7 " autocomplete="tel">
      <button class="btn wa full" id="send" disabled>${I.wa} Получить код в WhatsApp</button>
      <p class="hint">Нажимая кнопку, вы соглашаетесь с <a href="#/">условиями</a> платформы</p>`);
    const ph = $('#ph'), send = $('#send');
    const fmt = v => {
      const d = v.replace(/\D/g, '').replace(/^[78]?/, '').slice(0, 10);
      const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)];
      return { d, s: '+7 ' + (p[0] ? `(${p[0]}` + (d.length >= 3 ? ') ' : '') : '') + p[1] + (p[2] ? '-' + p[2] : '') + (p[3] ? '-' + p[3] : '') };
    };
    ph.oninput = () => { const f = fmt(ph.value); ph.value = f.s; send.disabled = f.d.length < 10; };
    ph.focus();
    ph.setSelectionRange(3, 3);
    send.onclick = () => {
      const phone = ph.value;
      send.disabled = true;
      send.innerHTML = 'Отправляем…';
      setTimeout(() => {
        stepCode(phone);
        toast(`<div class="ic">${I.wa}</div><div><b>Interna Academy</b><span>Ваш код для входа: <em>${CODE}</em>. Никому не сообщайте его.</span><small>WhatsApp · сейчас</small></div>`);
      }, 900);
    };
  };
  const stepCode = phone => {
    m.set(`
      <h2>Код из WhatsApp</h2>
      <div class="wahead">${I.wa}<div>Отправили сообщение с кодом на <b>${esc(phone)}</b></div></div>
      <div class="code">${'<input inputmode="numeric" autocomplete="one-time-code" aria-label="Цифра кода">'.repeat(4)}</div>
      <p class="hint" id="err">В демо код — ${CODE}</p>
      <p class="hint"><a href="#" id="back">Изменить номер</a> · Отправить снова через 0:59</p>`);
    const ins = [...document.querySelectorAll('.code input')];
    ins[0].focus();
    ins.forEach((inp, i) => {
      inp.oninput = () => {
        const d = inp.value.replace(/\D/g, '').slice(0, 4 - i);
        inp.value = d[0] || '';
        [...d.slice(1)].forEach((x, k) => (ins[i + 1 + k].value = x));
        if (d) ins[Math.min(i + d.length, 3)].focus();
        const v = ins.map(x => x.value).join('');
        if (v.length === 4) {
          if (v === CODE) { document.querySelectorAll('.toast').forEach(t => t.remove()); S.user ? finish() : stepProfile(phone); }
          else { $('#err').textContent = 'Неверный код, попробуйте ещё раз'; $('#err').style.color = 'var(--red)'; ins.forEach(x => (x.value = '')); ins[0].focus(); }
        }
      };
      inp.onkeydown = e => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); };
      inp.onpaste = e => { const v = (e.clipboardData.getData('text').match(/\d/g) || []).slice(0, 4); v.forEach((d, k) => (ins[k].value = d)); if (v.length === 4) ins[3].dispatchEvent(new Event('input')); e.preventDefault(); };
    });
    $('#back').onclick = e => { e.preventDefault(); stepPhone(); };
  };
  const stepProfile = phone => {
    m.set(`
      <h2>Почти готово</h2>
      <p class="sub">Эти данные будут в вашем сертификате.</p>
      <label class="f" for="nm">ФИО</label>
      <input class="inp" id="nm" value="Иванова Алия Сериковна" autocomplete="name">
      <label class="f" for="sc">Специальность</label>
      <select class="inp" id="sc">${['Гастроэнтеролог', 'Терапевт', 'Врач общей практики', 'Эндокринолог', 'Кардиолог', 'Педиатр', 'Акушер-гинеколог', 'Другое'].map(s => `<option>${s}</option>`).join('')}</select>
      <button class="btn red full" id="go">Готово</button>`);
    $('#go').onclick = () => {
      S.user = { name: $('#nm').value.trim() || 'Врач', spec: $('#sc').value, phone };
      if (!S.owned.length) {
        /* Для демо в кабинете уже есть пройденный курс и курс в процессе */
        S.owned = [32, 23];
        S.progress = { 32: lessons(byId(32)).length, 23: 3 };
        S.orders = [
          { id: 32, date: '12 сентября 2026', method: 'Kaspi Pay', sum: 25000 },
          { id: 23, date: '28 октября 2026', method: 'Карта Visa •• 4417', sum: 25000 },
        ];
      }
      finish();
    };
  };
  const finish = () => {
    save();
    m.close();
    header();
    snack(`Добро пожаловать, ${S.user.name.split(' ')[1] || S.user.name}!`);
    route(true);
    if (after) after();
  };
  stepPhone();
}

/* ---------- Оплата ---------- */
function openPay(c) {
  if (!S.user) return openLogin(() => openPay(c));
  if (owns(c.id)) return (location.hash = `#/learn/${c.id}`);
  let method = 'kaspi';
  const m = modal('');
  const choose = () => {
    m.set(`
      <h2>Оплата курса</h2>
      <p class="sub">${c.t}</p>
      <div class="pay">
        <button class="po on" data-m="kaspi"><span class="lg kp">Kaspi</span><span>Kaspi Pay<small>Подтверждение в приложении Kaspi.kz</small></span><i class="rd"></i></button>
        <button class="po" data-m="card"><span class="lg bc">${I.card}</span><span>Банковская карта<small>Visa, Mastercard · защищённая оплата</small></span><i class="rd"></i></button>
      </div>
      <div class="sumrow"><span>К оплате</span><b>${money(c.price)}</b></div>
      <button class="btn red full" id="pay">Оплатить ${money(c.price)}</button>
      <p class="hint">Чек придёт на WhatsApp. Доступ откроется сразу после оплаты.</p>`);
    document.querySelectorAll('.po').forEach(b => (b.onclick = () => {
      method = b.dataset.m;
      document.querySelectorAll('.po').forEach(x => x.classList.toggle('on', x === b));
    }));
    $('#pay').onclick = wait;
  };
  const wait = () => {
    m.set(`<div class="okc"><div class="spin"></div><h2 style="font-size:26px">${method === 'kaspi' ? 'Подтвердите оплату в Kaspi.kz' : 'Проводим оплату картой'}</h2><p class="sub">${method === 'kaspi' ? 'Мы отправили запрос в приложение Kaspi. Подтвердите платёж — и вернитесь сюда.' : 'Защищённая страница банка. Это займёт пару секунд.'}</p></div>`);
    setTimeout(success, 1800);
  };
  const success = () => {
    S.owned.push(c.id);
    S.progress[c.id] = S.progress[c.id] || 0;
    S.orders.unshift({ id: c.id, date: today(), method: method === 'kaspi' ? 'Kaspi Pay' : 'Карта Visa •• 4417', sum: c.price });
    save();
    m.set(`
      <div class="okc">
        <div class="big">${I.check}</div>
        <h2>Оплата прошла</h2>
        <p class="sub">Курс уже в вашем кабинете. ${c.f === 'live' ? `Напомним об эфире ${c.date} в WhatsApp.` : 'Можно начинать прямо сейчас.'}</p>
        <a class="btn red full" href="#/learn/${c.id}">Начать обучение ${I.arrow}</a>
        <a class="btn line full" style="margin-top:10px" href="#/cabinet">Перейти в кабинет</a>
      </div>`);
    document.querySelectorAll('#mb a').forEach(a => a.addEventListener('click', () => m.close()));
    header();
    route(true);
  };
  choose();
}

/* ---------- Сертификат ---------- */
function openCert(c) {
  modal(`
    <div class="cert" style="box-shadow:none;padding:36px">
      <div class="lg"></div>
      <div class="ttl">Сертификат</div>
      <div class="nm">${esc(S.user.name)}</div>
      <div class="cr">за успешное прохождение курса «${c.t}»</div>
      <div class="bt"><div class="ze">${c.ze} ЗЕ<small>${c.h} академических часов</small></div><div class="qr"></div></div>
    </div>
    <button class="btn red full" style="margin-top:20px" id="pdf">Скачать PDF</button>`, 'wide');
  $('.modal', layer).style.maxWidth = '620px';
  $('#pdf').onclick = () => snack('В демо-версии PDF не формируется');
}

/* ---------- Кабинет ---------- */
function cabinet(tab = '') {
  if (!S.user) {
    app.innerHTML = `<section class="sec"><div class="w" style="text-align:center;max-width:620px"><div class="kick">Личный кабинет</div><h2>Войдите, чтобы увидеть свои курсы</h2><p class="lead" style="margin:16px auto 32px">Вход по номеру телефона — код придёт в WhatsApp.</p><button class="btn wa" id="cl">${I.wa} Войти через WhatsApp</button></div></section>`;
    $('#cl').onclick = () => openLogin();
    return;
  }
  const mine = S.owned.map(byId).filter(Boolean);
  const fin = mine.filter(done);
  const active = mine.filter(c => !done(c));
  const pct = c => Math.round(100 * Math.min(S.progress[c.id] || 0, lessons(c).length) / lessons(c).length);
  const nav = [['', 'Мои курсы', I.book], ['certs', 'Сертификаты', I.cert], ['history', 'История оплат', I.hist], ['profile', 'Профиль', I.user]];
  let body = '';
  if (!tab) {
    const cur = active[0];
    body = `
      <h2>Мои курсы</h2>
      <div class="kpis">
        <div class="kpi n"><b>${fin.reduce((a, c) => a + c.ze, 0)}</b><span>ЗЕ набрано</span></div>
        <div class="kpi"><b>${mine.length}</b><span>курсов куплено</span></div>
        <div class="kpi"><b>${fin.reduce((a, c) => a + c.h, 0)}</b><span>часов обучения</span></div>
      </div>
      ${cur ? `<div class="cont"><img src="${cur.img}" alt=""><div><div class="l">Продолжить обучение</div><h3>${cur.t}</h3><p>Урок ${Math.min((S.progress[cur.id] || 0) + 1, lessons(cur).length)} из ${lessons(cur).length} · ${lessons(cur)[Math.min(S.progress[cur.id] || 0, lessons(cur).length - 1)]}</p><div class="prog"><i style="width:${pct(cur)}%"></i></div><a class="btn red" href="#/learn/${cur.id}">${I.play} Продолжить</a></div></div>` : ''}
      <div class="my">
        ${mine.map(c => `<a class="myc" href="#/learn/${c.id}"><img src="${c.img}" alt=""><div class="bd"><span class="meta">${c.s}</span><h3>${c.t}</h3><div class="pr2"><span>${done(c) ? 'Пройден · сертификат готов' : `Пройдено ${pct(c)}%`}</span><span>${c.ze} ЗЕ</span></div><div class="prog"><i style="width:${pct(c)}%;${done(c) ? 'background:var(--ok)' : ''}"></i></div></div></a>`).join('')}
      </div>
      <div style="margin-top:36px"><a class="btn line" href="#/catalog">Найти ещё курсы</a></div>`;
  } else if (tab === 'certs') {
    body = `<h2>Сертификаты</h2><p class="lead" style="margin-bottom:32px">Всего ${fin.reduce((a, c) => a + c.ze, 0)} ЗЕ · ${fin.reduce((a, c) => a + c.h, 0)} часов</p>
      ${fin.length ? `<div class="certs">${fin.map(c => `<div class="cr2"><div class="ic">${I.cert}</div><div><b>${c.t}</b><span>${c.ze} ЗЕ · ${c.h} часов</span></div><button class="btn line" data-cert="${c.id}">Открыть</button></div>`).join('')}</div>` : '<p class="lead">Сертификат появится после итогового теста.</p>'}`;
  } else if (tab === 'history') {
    body = `<h2>История оплат</h2><div style="margin-top:32px;overflow-x:auto"><table class="hist"><thead><tr><th>Курс</th><th>Дата</th><th>Способ</th><th class="r">Сумма</th></tr></thead><tbody>
      ${S.orders.map(o => `<tr><td style="padding-right:20px">${byId(o.id).t}<br><span class="st">Оплачено</span></td><td style="white-space:nowrap;padding-right:20px">${o.date}</td><td style="padding-right:20px">${o.method}</td><td class="r" style="white-space:nowrap">${money(o.sum)}</td></tr>`).join('')}
    </tbody></table></div>`;
  } else {
    body = `<h2>Профиль</h2><div class="prof" style="margin-top:32px">
      <label class="f">ФИО — так будет в сертификате</label><input class="inp" id="pn" value="${esc(S.user.name)}">
      <label class="f">Специальность</label><input class="inp" id="ps" value="${esc(S.user.spec)}">
      <label class="f">Телефон для входа и уведомлений</label><input class="inp" value="${esc(S.user.phone)}" disabled>
      <div class="wahead">${I.wa}<div>Напоминания об эфирах и чеки приходят в WhatsApp</div></div>
      <button class="btn red" id="psave">Сохранить</button></div>`;
  }
  app.innerHTML = `
  <div class="w cab">
    <aside class="side">
      <div class="me"><span class="avatar">${initials(S.user.name)}</span><div><b>${esc(S.user.name)}</b><span>${esc(S.user.spec)}</span></div></div>
      ${nav.map(([k, t, ic]) => `<a href="#/cabinet${k ? '/' + k : ''}" class="${k === tab ? 'on' : ''}">${ic}${t}</a>`).join('')}
      <a href="#" class="out" id="logout">${I.out}Выйти</a>
    </aside>
    <div>${body}</div>
  </div>`;
  document.querySelectorAll('[data-cert]').forEach(b => (b.onclick = () => openCert(byId(b.dataset.cert))));
  const ps = $('#psave');
  if (ps) ps.onclick = () => { S.user.name = $('#pn').value.trim() || S.user.name; S.user.spec = $('#ps').value.trim(); save(); header(); route(); snack('Сохранено'); };
  $('#logout').onclick = e => { e.preventDefault(); S = blank(); save(); header(); location.hash = '#/'; snack('Вы вышли из кабинета'); };
}

/* ---------- Урок ---------- */
function learn(id, q) {
  const c = byId(id);
  if (!c) return notFound();
  if (!S.user || !owns(c.id)) return (location.hash = `#/course/${c.id}`);
  const ls = lessons(c);
  const prog = Math.min(S.progress[c.id] || 0, ls.length);
  const n = Math.min(+(q.get('l') ?? Math.min(prog, ls.length - 1)), ls.length - 1);
  const isTest = n === ls.length - 1;
  const pct = Math.round((100 * prog) / ls.length);
  const tab = q.get('t') || 'about';
  const main = isTest
    ? `<div class="kick">Итоговое тестирование</div><h1 style="margin-top:0">${c.t}</h1><p class="lead">Ответьте на вопросы — после успешной сдачи сертификат с ${c.ze} ЗЕ появится в кабинете.</p>
       <div class="q"><b>1. Какой метод предпочтителен для первичной оценки фиброза на амбулаторном этапе?</b>
         ${['Биопсия печени', 'Неинвазивные индексы (FIB-4) и эластометрия', 'КТ органов брюшной полости', 'Только биохимия крови'].map((a, i) => `<label><input type="radio" name="q1" ${i === 1 ? 'data-ok' : ''}>${a}</label>`).join('')}</div>
       <div class="q"><b>2. Что важнее всего обсудить с коморбидным пациентом при первом визите?</b>
         ${['Только диету', 'Модифицируемые факторы риска и план наблюдения', 'Срочную госпитализацию', 'Отмену всех препаратов'].map((a, i) => `<label><input type="radio" name="q2" ${i === 1 ? 'data-ok' : ''}>${a}</label>`).join('')}</div>
       <button class="btn red" id="finish" style="margin-top:24px">${done(c) ? 'Тест сдан · открыть сертификат' : 'Завершить тест'}</button>`
    : `${player(c.id === 35 ? 'img/hero35.webp' : c.img, `Урок ${n + 1} · ${ls[n]}`)}
       <h1>${n + 1}. ${ls[n]}</h1>
       <div class="meta"><span>${I.clock}42 мин</span><span>${c.s}</span></div>
       <div class="tabs" id="tabs">
         <button data-t="about" class="${tab === 'about' ? 'on' : ''}">Описание</button>
         <button data-t="mat" class="${tab === 'mat' ? 'on' : ''}">Материалы</button>
         <button data-t="case" class="${tab === 'case' ? 'on' : ''}">Клинический случай</button>
       </div>
       ${tab === 'about' ? `<p class="lead" style="max-width:none">Лекция разбирает тему «${ls[n].toLowerCase()}» на примерах из практики: что изменилось в рекомендациях, как выстроить тактику и где чаще всего ошибаются. В конце — короткий вывод и вопросы для самопроверки.</p>`
         : tab === 'mat' ? `<div class="mat"><span class="ic">PDF</span><div><b>Слайды лекции</b><span>4,2 МБ</span></div><a href="#" data-dl>Скачать</a></div><div class="mat"><span class="ic">PDF</span><div><b>Клинические рекомендации — конспект</b><span>1,1 МБ</span></div><a href="#" data-dl>Скачать</a></div>`
         : `<div class="mat" style="align-items:start"><span class="ic" style="background:var(--sky);color:var(--navy)">${I.case}</span><div><b>Пациентка 46 лет, ИМТ 32, СД 2 типа</b><span>Жалоб нет, при УЗИ — стеатоз. Какие обследования назначить и как выстроить наблюдение? Разбор — во второй половине лекции.</span></div></div>`}
       <div style="display:flex;gap:12px;margin-top:32px;flex-wrap:wrap"><button class="btn red" id="next">${n < prog ? 'Следующий урок' : 'Отметить пройденным и дальше'} ${I.arrow}</button></div>`;
  app.innerHTML = `
  <div class="w lesson">
    <div>
      <div class="crumbs" style="margin-bottom:20px"><a href="#/cabinet">Мои курсы</a> / ${c.t}</div>
      ${main}
    </div>
    <aside class="ls">
      <div class="hd"><b>${c.t}</b><div class="prog"><i style="width:${pct}%"></i></div><span>Пройдено ${prog} из ${ls.length} · ${pct}%</span></div>
      ${ls.map((t, i) => `<a class="li${i < prog ? ' done' : ''}${i === n ? ' on' : ''}${i === ls.length - 1 ? ' test' : ''}" href="#/learn/${c.id}?l=${i}"><span class="n">${i < prog ? I.check.replace('<svg', '<svg width="16" height="16"') : i + 1}</span><span>${t}<small>${i === ls.length - 1 ? '10 вопросов' : '42 мин'}</small></span></a>`).join('')}
    </aside>
  </div>`;
  bindPlayer($('#player'));
  const tabs = $('#tabs');
  if (tabs) tabs.onclick = e => { const b = e.target.closest('button'); if (b) location.hash = `#/learn/${c.id}?l=${n}&t=${b.dataset.t}`; };
  document.querySelectorAll('[data-dl]').forEach(a => (a.onclick = e => { e.preventDefault(); snack('В демо-версии файлы не скачиваются'); }));
  const next = $('#next');
  if (next) next.onclick = () => {
    S.progress[c.id] = Math.max(prog, n + 1);
    save();
    location.hash = `#/learn/${c.id}?l=${n + 1}`;
  };
  const fin = $('#finish');
  if (fin) fin.onclick = () => {
    if (done(c)) return openCert(c);
    const ok = [...document.querySelectorAll('.q input:checked')];
    if (ok.length < 2) return snack('Ответьте на все вопросы');
    if (!ok.every(x => x.hasAttribute('data-ok'))) return snack('Есть ошибка — попробуйте ещё раз');
    S.progress[c.id] = ls.length;
    save();
    route(true);
    modal(`<div class="okc"><div class="big">${I.award}</div><h2>Курс пройден!</h2><p class="sub">Сертификат с ${c.ze} ЗЕ уже в вашем кабинете.</p><button class="btn red full" id="sc">Открыть сертификат</button><a class="btn line full" style="margin-top:10px" href="#/cabinet/certs">Все сертификаты</a></div>`);
    $('#sc').onclick = () => openCert(c);
    document.querySelectorAll('#mb a').forEach(a => a.addEventListener('click', () => (layer.innerHTML = '')));
  };
}

function notFound() {
  app.innerHTML = `<section class="sec"><div class="w" style="text-align:center"><h2>Страница не найдена</h2><p class="lead" style="margin:16px auto 32px">Возможно, курс переехал.</p><a class="btn red" href="#/catalog">В каталог</a></div></section>`;
}

/* ---------- Маршрутизатор ---------- */
let lastPath = null;
function route(keepLayer) {
  const raw = location.hash.slice(1) || '/';
  const [pathQ, anchor] = raw.split('#');
  const [path, qs] = pathQ.split('?');
  const q = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  if (keepLayer !== true) layer.innerHTML = '';
  $('#menu').classList.remove('open');
  if (!parts.length) home();
  else if (parts[0] === 'catalog') catalog(q);
  else if (parts[0] === 'course') course(parts[1]);
  else if (parts[0] === 'cabinet') cabinet(parts[1] || '');
  else if (parts[0] === 'learn') learn(parts[1], q);
  else notFound();
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', parts[0] === 'catalog' && (a.dataset.nav === 'live') === (q.get('f') === 'live')));
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 30);
  else if (path !== lastPath || (parts[0] === 'learn' && !q.get('t'))) window.scrollTo(0, 0);
  lastPath = path;
}
$('#burger').onclick = () => $('#menu').classList.toggle('open');
window.addEventListener('hashchange', route);
header();
route();
