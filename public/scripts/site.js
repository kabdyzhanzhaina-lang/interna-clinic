/* Interna Clinic — клиентские механики. Без библиотек. Уважает prefers-reduced-motion. */
(function () {
  "use strict";
  // иконки показываем после загрузки шрифта (или через 2.5 с, если шрифт не пришёл)
  const fontsOk = () => document.documentElement.classList.add("fonts-ok");
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fontsOk); setTimeout(fontsOk, 2500);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KK = window.LANG === "kk";
  // строки, которые скрипт пишет сам (остальной текст переводится при сборке)
  const T = KK ? { slots: [["Таң", "08:00–12:00"], ["Күндіз", "12:00–17:00"], ["Кеш", "17:00–20:00"], ["Кез келген", "ыңғайлы уақыт"]], book: "Жазылу: ", any: "кез келген уақыт", stac: "Стационарлық формат: палата, дәрігер бақылауы, тамақтану және емшаралар кіреді. Бағдарлама бағасына стационарда болу қосылады.", amb: "Амбулаторлық формат: ыңғайлы, икемді жоспарлау, оңтайлы баға.", plusStac: " + стационар", yours: "Сіздің бағдарламаңыз: ", bookBtn: "Жазылу", confirm: "Растау — ", callTo: "қоңыраумен: ", waBook: "Сәлеметсіз бе! Жазылғым келеді: ", none: "Ештеңе табылмады — телефон соғыңыз, көмектесеміз", hintEnter: "Enter — бірінші нәтижені ашу", hintEsc: "Esc — жабу", date: "күні ", waCu: "Сәлеметсіз бе! Сайтта check-up-қа өтінім қалдырдым.", tel: "Телефон: ", fail: "Өтінімді жіберу мүмкін болмады. Телефон соғыңыз немесе WhatsApp-қа жазыңыз — біз байланыстамыз." }
    : { slots: [["Утро", "08:00–12:00"], ["День", "12:00–17:00"], ["Вечер", "17:00–20:00"], ["Любое", "как удобно"]], book: "Записаться: ", any: "любое время", stac: "", amb: "", plusStac: " + стационар", yours: "Ваша программа: ", bookBtn: "Записаться", confirm: "Подтверждение — ", callTo: "звонком на ", waBook: "Здравствуйте! Хочу записаться: ", none: "Ничего не нашли — позвоните, подскажем", hintEnter: "Enter — открыть первый результат", hintEsc: "Esc — закрыть", date: "дата ", waCu: "Здравствуйте! Оставил(а) заявку на check-up на сайте.", tel: "Телефон: " };
  const SLOTS = T.slots;   // точное время подтверждает администратор

  /* ── шапка: «Алматы · сегодня до 20:00» — часы на текущий день ── */
  $$("[data-today]").forEach((el) => { const d = new Date().getDay(), h = d === 0 || d === 6 ? el.dataset.we : el.dataset.wd; el.textContent = (KK ? "Алматы · бүгін " : "Алматы · сегодня до ") + h + (KK ? "-ге дейін" : ""); });

  /* ── появление при прокрутке ── */
  if (!reduce && "IntersectionObserver" in window) {
    const reveal = (e) => { e.classList.add("in"); setTimeout(() => e.classList.add("rv-done"), 1300); };   // после анимации — обычные transition карточки
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { reveal(x.target); io.unobserve(x.target); } }), { rootMargin: "-40px 0px" });
    $$(".rv").forEach((e) => { if (e.getBoundingClientRect().top < innerHeight * 0.9) reveal(e); else io.observe(e); });
  } else $$(".rv").forEach((e) => e.classList.add("in"));

  /* ── заголовки по словам: h2.h внутри .rv — каждое слово выезжает снизу с задержкой ── */
  if (!reduce) $$("h2.h").forEach((h) => {
    if (!h.closest(".rv") || h.querySelector(".sw")) return;
    let i = 0;
    const wrap = (node) => {
      Array.from(node.childNodes).forEach((c) => {
        if (c.nodeType === 3) {
          const parts = c.textContent.split(/(\s+)/); const frag = document.createDocumentFragment();
          parts.forEach((t) => { if (!t) return; if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; } const o = document.createElement("span"); o.className = "sw"; const n = document.createElement("span"); n.textContent = t; n.style.setProperty("--i", i++); o.appendChild(n); frag.appendChild(o); });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && !c.classList.contains("msr")) wrap(c);
      });
    };
    wrap(h);
  });

  /* ── счётчики ── */
  function runCount(el) {
    const end = parseInt(el.dataset.count, 10); if (isNaN(end)) return;
    if (reduce) { el.textContent = end; return; }
    let t0 = null;
    const step = (t) => { if (!t0) t0 = t; let p = Math.min(1, (t - t0) / 1400); p = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * p); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { runCount(x.target); cio.unobserve(x.target); } }), { threshold: 0.5 });
    $$("[data-count]").forEach((e) => cio.observe(e));
  }

  /* ── аккордеоны ── */
  $$("[data-acc]").forEach((acc) => {
    const items = $$(".acc-item", acc);
    items.forEach((item) => $(".acc-q", item).addEventListener("click", () => {
      const open = item.classList.contains("open");
      items.forEach((o) => { o.classList.remove("open"); $(".acc-a", o).style.height = "0px"; });
      if (!open) { item.classList.add("open"); const a = $(".acc-a", item); a.style.height = a.scrollHeight + "px"; }
    }));
  });

  /* ── печатающееся слово в хиро: [data-typing="слово|слово"] — набирается по буквам, стирается, следующее ── */
  function rotateWords(el) {
    if (!el) return;
    const words = (el.dataset.typing || "").split("|").filter(Boolean); if (words.length < 2) return;
    const w = $(".rw-w", el); if (!w || reduce) return;
    const m = document.createElement("span"); m.className = "rw-m"; el.appendChild(m);
    const cur = document.createElement("i"); cur.className = "rw-cur"; cur.setAttribute("aria-hidden", "true"); el.appendChild(cur);
    const fit = () => { let mx = 0; words.forEach((t) => { m.textContent = t; mx = Math.max(mx, m.getBoundingClientRect().width); }); el.style.minWidth = Math.ceil(mx) + "px"; };
    fit(); addEventListener("resize", fit);
    let wi = 0, ci = words[0].length, del = false;
    const tick = () => {
      if (!el.isConnected) return;
      const t = words[wi]; w.textContent = t.slice(0, ci);
      el.classList.toggle("typing", !(ci === t.length && !del) && ci !== 0);
      if (!del) { ci++; if (ci > t.length) { ci = t.length; del = true; setTimeout(tick, 2200); return; } }
      else { ci--; if (ci < 0) { ci = 0; del = false; wi = (wi + 1) % words.length; setTimeout(tick, 350); return; } }
      setTimeout(tick, del ? 45 : 95);
    };
    setTimeout(tick, 2200);
  }
  rotateWords($("[data-typing]"));

  /* ── печатная машинка ── */
  function typewriter(el) {
    if (!el) return;
    const words = (el.dataset.words || "").split("|").filter(Boolean); if (!words.length) return;
    if (reduce) { el.textContent = words[0]; return; }
    let wi = 0, ci = words[0].length, del = false;
    const tick = () => {
      if (!el.isConnected) return;
      const w = words[wi]; el.textContent = w.slice(0, ci);
      if (!del) { ci++; if (ci > w.length) { del = true; setTimeout(tick, 1700); return; } }
      else { ci--; if (ci === 0) { del = false; wi = (wi + 1) % words.length; } }
      setTimeout(tick, del ? 36 : 80);
    };
    setTimeout(tick, 1400);
  }
  $$("[data-words]").forEach(typewriter);

  /* ── слоты ── */
  function renderSlots(cont, btn, count) {
    if (!cont) return;
    cont.innerHTML = SLOTS.slice(0, count || 3).map((s, i) => `<button type="button" class="slot" aria-pressed="${i === 0}">${s[0]}<small>${s[1]}</small></button>`).join("");
    cont.addEventListener("click", (e) => { const b = e.target.closest(".slot"); if (!b) return; $$(".slot", cont).forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); if (btn) btn.textContent = T.book + b.firstChild.nodeValue.trim().toLowerCase(); });
  }
  renderSlots($("[data-slots]"), $("[data-slotbtn]"));

  /* ── pinned-сцена ── */
  const story = $("#story");
  if (story) {
    const frames = $$(".sframe", story), dots = $$(".sdots i", story), prog = $("#sprog");
    let tick = false;
    const upd = () => {
      const r = story.getBoundingClientRect(); const total = story.offsetHeight - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / (total <= 0 ? 1 : total)));
      const i = Math.min(frames.length - 1, Math.floor(p * frames.length));
      frames.forEach((f, n) => f.classList.toggle("on", n === i)); dots.forEach((d, n) => d.classList.toggle("on", n === i));
      if (prog) prog.style.width = p * 100 + "%";
    };
    addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(() => { upd(); tick = false; }); } }, { passive: true }); upd();
  }

  /* ── отзывы ── */
  const tt = $("#ttrack");
  if (tt) {
    const n = tt.children.length; let idx = 0; const dots = $$("#tdots i");
    const go = (i) => { idx = (i + n) % n; tt.scrollTo({ left: tt.clientWidth * idx, behavior: reduce ? "auto" : "smooth" }); };
    $("[data-tprev]").addEventListener("click", () => go(idx - 1));
    $("[data-tnext]").addEventListener("click", () => go(idx + 1));
    tt.addEventListener("scroll", () => { idx = Math.round(tt.scrollLeft / Math.max(1, tt.clientWidth)); dots.forEach((d, k) => d.classList.toggle("on", k === idx)); }, { passive: true });
    setInterval(() => { if (document.visibilityState === "visible") go(idx + 1); }, 6000);
  }

  /* ── шаги процедуры ── */
  const tl = $("#tl");
  if (tl) {
    $$(".st", tl).forEach((st) => st.addEventListener("click", () => {
      $$(".st", tl).forEach((s) => s.classList.toggle("on", s === st));
      $("#tlNum").textContent = +st.dataset.step + 1;
      const b = $("#tlBody"); b.innerHTML = `<h4>${st.dataset.title}</h4><p>${st.dataset.text}</p>`;
      if (!reduce) { b.classList.remove("swap"); void b.offsetWidth; b.classList.add("swap"); }
    }));
  }

  /* ── фильтр врачей ── */
  const df = $("#docfilter");
  if (df) df.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]"); if (!b) return;
    $$(".chip", df).forEach((c) => c.classList.toggle("on", c === b));
    const cat = b.dataset.cat;
    $$("#docgrid [data-doc-cat]").forEach((card) => { card.hidden = !(cat === "all" || card.dataset.docCat.split(" ").includes(cat)); });
  });

  /* ── цены: табы + поиск ── */
  const pt = $("#ptabs");
  if (pt) {
    const tables = $$("[data-price-tab]");
    const show = (name) => tables.forEach((t) => { t.hidden = t.dataset.priceTab !== name; $$(".tr", t).forEach((r) => (r.hidden = false)); });
    pt.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; $$(".chip", pt).forEach((c) => c.classList.toggle("on", c === b)); $("#psearch").value = ""; show(b.dataset.tab); });
    $("#psearch").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) { show($(".chip.on", pt).dataset.tab); return; }
      tables.forEach((t) => { let any = false; $$(".tr", t).forEach((r) => { const ok = r.textContent.toLowerCase().includes(q); r.hidden = !ok; any = any || ok; }); t.hidden = !any; });
    });
  }

  /* ── check-up: формат + квиз ── */
  const cuf = $("#cuFormat");
  if (cuf) cuf.addEventListener("click", (e) => {
    const b = e.target.closest("[data-fmt]"); if (!b) return;
    $$("button", cuf).forEach((x) => x.classList.toggle("on", x === b));
    const stac = b.dataset.fmt === "stac";
    $("#cuNote").textContent = stac ? (T.stac || "Стационарный формат: палата, наблюдение врача, питание и процедуры включены. К цене программы добавляется стационар — от 35 000 ₸ за сутки дневного или от 60 000 ₸ за сутки круглосуточного.") : (T.amb || "Амбулаторный формат: приезжаете утром натощак, к вечеру — результаты и разбор с врачом.");
    $$("[data-cu] .ft b").forEach((el) => { if (!el.dataset.base) el.dataset.base = el.textContent; el.textContent = stac ? el.dataset.base + T.plusStac : el.dataset.base; });
  });
  const quiz = $("#quiz");
  if (quiz) {
    const ans = {};
    quiz.addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]"); if (!b) return;
      const grp = b.closest("[data-q]"); $$("button", grp).forEach((x) => x.classList.toggle("on", x === b));
      ans[grp.dataset.q] = b.dataset.v;
      if (ans.who && ans.age && ans.pain) {
        const cards = $$("[data-cu]");
        const fits = (c, strict) => { const who = c.dataset.who.split(","), age = c.dataset.age.split(","), pain = c.dataset.pain.split(","); if (ans.who === "k") return who.includes("k"); return who.includes(ans.who) && (!strict || (pain.includes(ans.pain) && age.includes(ans.age))); };
        const best = cards.find((c) => fits(c, true)) || cards.find((c) => fits(c, false)) || cards[0];
        $("#quizres").innerHTML = `${T.yours}<b>${best.dataset.title}</b> — ${best.dataset.price}. <button type="button" class="btn btn-primary sm" data-book data-svc="Check-up" style="margin-left:8px">Записаться</button>`;
        cards.forEach((c) => { c.style.outline = c === best ? "3px solid var(--blue)" : ""; c.style.outlineOffset = "4px"; });
      }
    });
  }

  /* ── подготовка: вкладки ── */
  /* ── высота шапки → CSS-переменная, чтобы хиро точно стыковался с топбаром ── */
  const setHdr = () => { const h = $(".hdr"); if (h) document.documentElement.style.setProperty("--hdr-h", h.offsetHeight + "px"); }; setHdr(); addEventListener("resize", setHdr);

  /* ── вкладки-чипы: любая группа [data-prep] переключает свои [data-prep-set]; [data-prep-go] — ссылка на вкладку ── */
  const switchPrep = (id) => {
    const btn = $(`[data-prep="${id}"]`); if (!btn) return;
    const group = btn.closest(".chips"); const ids = $$("[data-prep]", group).map((b) => b.dataset.prep);
    $$("[data-prep]", group).forEach((c) => { c.classList.toggle("on", c === btn); c.setAttribute("aria-selected", c === btn ? "true" : "false"); });
    $$("[data-prep-set]").forEach((set) => { if (ids.includes(set.dataset.prepSet)) set.hidden = set.dataset.prepSet !== id; });
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-prep]"); if (b) return switchPrep(b.dataset.prep);
    const g = e.target.closest("[data-prep-go]"); if (g) { switchPrep(g.dataset.prepGo); $(`[data-prep="${g.dataset.prepGo}"]`).closest(".chips").scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  if (location.hash && $(`[data-prep="${location.hash.slice(1)}"]`)) switchPrep(location.hash.slice(1));

  /* ── параллакс при скролле (как в редакционных лонгридах): data-parallax="0.2" ── */
  /* data-rotate="0.08" — элемент крутится при скролле (градусов на пиксель прокрутки), можно вместе с data-parallax */
  const px = $$("[data-parallax],[data-rotate]");
  if (px.length && !reduce) {
    let pt = false;
    const upd = () => {
      const vc = innerHeight / 2, y = scrollY;
      px.forEach((el) => {
        const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return;
        let t = "";
        if (el.dataset.parallax) { const d = (r.top + r.height / 2 - vc) * parseFloat(el.dataset.parallax); t += `translate3d(0, ${(-d).toFixed(1)}px, 0)`; }
        if (el.dataset.rotate) t += ` rotate(${(y * parseFloat(el.dataset.rotate)).toFixed(2)}deg)`;
        if (el.dataset.parallaxScale) t += ` scale(${el.dataset.parallaxScale})`;
        el.style.transform = t;
      });
    };
    addEventListener("scroll", () => { if (!pt) { pt = true; requestAnimationFrame(() => { upd(); pt = false; }); } }, { passive: true }); upd();
  }
  /* ── тайм-коды видео: клик перематывает встроенный ролик ── */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-seek]"); const fr = $("#ytframe"); if (!b || !fr) return;
    fr.src = `https://www.youtube-nocookie.com/embed/${fr.dataset.video}?start=${b.dataset.seek}&autoplay=1`;
    fr.closest(".acover").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  /* ── видео: превью → iframe по клику ── */
  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-yt]"); if (!v) return;
    const fr = document.createElement("iframe"); fr.src = `https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0`; fr.allow = "autoplay; encrypted-media; picture-in-picture"; fr.allowFullscreen = true; fr.title = v.getAttribute("aria-label") || "Видео";
    const box = document.createElement("div"); box.className = "vcard playing"; box.appendChild(fr); v.replaceWith(box);
  });
  /* ── прогресс чтения статьи ── */
  const prog = $("#readprog");
  const rail = $("#arail");
  if (prog) addEventListener("scroll", () => { const a = $(".article .body"); if (!a) return; const r = a.getBoundingClientRect(); const total = r.height - innerHeight * 0.6; const p = Math.min(1, Math.max(0, -r.top / (total <= 0 ? 1 : total))); prog.style.width = (p * 100).toFixed(1) + "%"; if (rail) { $("b", rail).textContent = Math.round(p * 100) + "%"; $(".track i", rail).style.height = (p * 100).toFixed(1) + "%"; } }, { passive: true });
  /* ── статья: липкий CTA скрывает общий FAB, «поделиться» копирует ссылку ── */
  if ($("#stickycta")) document.body.classList.add("has-stickycta");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-share]"); if (!b) return; e.preventDefault();
    const url = location.href.split("?")[0];
    if (navigator.share) { navigator.share({ title: document.title, url }).catch(() => {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => { const t = b.textContent; b.textContent = "Скопировано"; setTimeout(() => { b.textContent = t; }, 1500); });
  });
  $$("[data-share-tg]").forEach((a) => { a.href = a.href.replace("url=&", "url=" + encodeURIComponent(location.href.split("?")[0]) + "&"); });

  /* ── свечение кнопок ── */
  document.addEventListener("pointermove", (e) => { const b = e.target.closest && e.target.closest(".btn"); if (!b) return; const r = b.getBoundingClientRect(); b.style.setProperty("--mx", e.clientX - r.left + "px"); b.style.setProperty("--my", e.clientY - r.top + "px"); });

  /* ── шапка, FAB, параллакс ── */
  let hTick = false;
  addEventListener("scroll", () => { if (hTick) return; hTick = true; requestAnimationFrame(() => { $("#hdr").classList.toggle("stuck", scrollY > 40); document.body.classList.toggle("scrolled", scrollY > 600); hTick = false; }); }, { passive: true });
  addEventListener("pointermove", (e) => { if (reduce) return; const h = $("#hero"); if (!h) return; const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5; $$(".blob", h).forEach((b, i) => { b.style.translate = `${x * (i ? -30 : 40)}px ${y * (i ? -24 : 30)}px`; }); });

  /* ── мобильное меню + дропдаун ── */
  const mnav = $("#mnav");
  const mnavSet = (on) => { mnav.classList.toggle("open", on); document.body.classList.toggle("mn-open", on); $("#burger").setAttribute("aria-expanded", on ? "true" : "false"); };
  $("#burger").addEventListener("click", () => mnavSet(true));
  $("#mnavX").addEventListener("click", () => mnavSet(false));
  $$(".mn-nav a, .mn-sec a, .mn-lang a", mnav).forEach((a) => a.addEventListener("click", () => mnavSet(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") mnavSet(false); });
  const w = $("#ddWrap");
  if (w) {
    const a = w.querySelector("a");
    const setOpen = (on) => { w.classList.toggle("open", on); document.body.classList.toggle("dd-open", on); a.setAttribute("aria-expanded", on ? "true" : "false"); };
    a.setAttribute("aria-haspopup", "true");
    // десктоп (мышь): меню раскрывается по наведению, клик по «Услуги» ведёт на страницу услуг; тач — клик открывает/закрывает
    const hoverable = matchMedia("(hover:hover) and (pointer:fine)").matches;
    if (hoverable) {
      let timer = 0;
      w.addEventListener("mouseenter", () => { clearTimeout(timer); setOpen(true); });
      w.addEventListener("mouseleave", () => { clearTimeout(timer); timer = setTimeout(() => setOpen(false), 260); });
      a.addEventListener("focus", () => setOpen(true));
    } else a.addEventListener("click", (e) => { e.preventDefault(); setOpen(!w.classList.contains("open")); });
    document.addEventListener("click", (e) => { if (!w.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    $$(".dd a", w).forEach((l) => l.addEventListener("click", () => setOpen(false)));
    addEventListener("scroll", () => { if (w.classList.contains("open") && scrollY > 120) setOpen(false); }, { passive: true });
  }

  /* ── модалка записи (макет 17 / 27 B): имя, телефон, услуга или врач, дата, время, способ связи ── */
  /* ── отправка заявки: true только после ответа сервера { ok: true }; без API (прототип) — считаем отправленной ── */
  window.sendLead = async (api, payload) => {
    if (!api) return true;
    try { const r = await fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const d = await r.json().catch(() => ({})); return r.ok && d.ok !== false; } catch (_) { return false; }
  };
  window.leadFail = (el, T) => {
    if (!el) return;
    el.classList.add("err"); el.style.color = "#B4342C";
    el.innerHTML = (T && T.fail ? T.fail : "Не получилось отправить заявку. Позвоните <a href='" + (document.querySelector('.hdr-phone,[href^="tel:"]')?.getAttribute('href') || '#') + "'>по телефону</a> или напишите в WhatsApp — мы на связи.");
  };
  const modal = $("#modal"), mSvc = $("#mSvc"), mDate = $("#mDate");
  const svcLabel = () => mSvc.value;
  const dateLabel = () => { if (!mDate.value) return ""; const [y, m, d] = mDate.value.split("-"); return `${d}.${m}.${y}`; };
  const contact = () => ($("#mContact .on") || {}).textContent || "";
  const summary = () => [svcLabel(), dateLabel(), $("#mTime").value].filter(Boolean).join(", ");
  let mType = "";   // тип заявки для CRM: visit | checkup | kids | vacancy | promo (data-type на кнопке, иначе воркер определит по услуге/странице)
  function openModal(svc, type) {
    mType = type || ""; modal.classList.add("open"); $("#mform").hidden = false; $("#mdone").hidden = true;
    if (svc) { let o = [...mSvc.options].find((x) => x.text === svc); if (!o) { o = new Option(svc, svc); mSvc.add(o, 0); } mSvc.value = o.value; }
    if (!mDate.min) mDate.min = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    document.body.style.overflow = "hidden";
    if (matchMedia("(min-width:701px)").matches) setTimeout(() => $("#mName").focus(), 320);
  }
  const closeModal = () => { modal.classList.remove("open"); document.body.style.overflow = ""; };
  $("#mContact").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#mContact button").forEach((x) => x.classList.toggle("on", x === b)); });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-book]"); if (b) { e.preventDefault(); document.body.classList.remove("mn-open"), $("#mnav").classList.remove("open"); openModal(b.dataset.svc, b.dataset.type); } });
  $("#modalX").addEventListener("click", closeModal); $("#mClose2").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  // иконка календаря открывает системный выбор даты
  $("#mDate").parentElement.querySelector(".msr").addEventListener("click", () => { try { mDate.showPicker(); } catch (_) { mDate.focus(); } });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); document.body.classList.remove("mn-open"), $("#mnav").classList.remove("open"); } });
  // WhatsApp из модалки: текст собирается из заполненных полей
  $("#mWa").addEventListener("click", (e) => {
    e.preventDefault();
    const name = $("#mName").value.trim();
    open(waHref(`${T.waBook}${summary()}.${name ? " " + name + "." : ""}`), "_blank", "noopener");
  });
  $("#mSubmit").addEventListener("click", async () => {
    const name = $("#mName").value.trim(), phone = $("#mPhone").value.trim();
    if (!$("#mAgree").checked) { $("#mAgree").focus(); $("#mAgree").parentElement.classList.add("err"); return; }
    if (!phone || !window.phoneOk(phone)) { $("#mPhone").focus(); $("#mPhone").style.borderColor = "#B4342C"; return; }
    const utm = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => /^(utm_|gclid|yclid|ymclid|fbclid)/.test(k)));
    const payload = { name, phone, service: svcLabel(), type: mType, referrer: document.referrer, date: dateLabel(), time: $("#mTime").value, contact: contact(), slot: [dateLabel(), $("#mTime").value].filter(Boolean).join(", ") || T.any, agree: true, page: location.pathname, ...utm };
    // Адрес API задаётся при сборке (PUBLIC_API_URL); куда дальше уходит заявка — настраивается в админке API (/admin)
    const api = window.SITE_API ? window.SITE_API.replace(/\/$/, "") + "/lead" : null;
    $("#mSubmit").disabled = true;
    const sent = await window.sendLead(api, payload);
    $("#mSubmit").disabled = false;
    if (!sent) { window.leadFail($("#mform .note"), T); return; }
    $("#mdoneTxt").textContent = `${name ? name + ", " : ""}${summary()}. ${T.confirm}${contact() === "Telegram" ? "Telegram " : contact() === "WhatsApp" ? "WhatsApp " : T.callTo}${phone}.`;
    $("#mform").hidden = true; $("#mdone").hidden = false;
  });

  /* ── поиск по сайту: индекс /search.json, подсказки в [data-search] ── */
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (x) => String(x).toLowerCase().replace(/ё/g, "е").trim();
  let IDX = null, idxP = null;
  const loadIdx = () => idxP || (idxP = fetch((window.BASE || "") + (KK ? "/kk" : "") + "/search.json").then((r) => r.json()).then((d) => (IDX = d.map((x) => ({ ...x, n: norm(x.t + " " + x.s + " " + x.k) })))).catch(() => (IDX = [])));
  const link = (u) => (window.BASE || "") + (KK && !/^\/kk/.test(u) ? "/kk" + u : u);
  function search(q) {
    q = norm(q); if (q.length < 2 || !IDX) return [];
    const toks = q.split(/\s+/).filter(Boolean), res = [];
    for (const it of IDX) {
      if (!toks.every((t) => it.n.includes(t))) continue;
      const tt = norm(it.t);
      let score = tt.startsWith(q) ? 0 : tt.includes(q) ? 1 : toks.every((t) => tt.includes(t)) ? 2 : 3;
      if (it.g === "Цены") score += 1;
      res.push([score, it]);
    }
    return res.sort((a, b) => a[0] - b[0]).slice(0, 8).map((x) => x[1]);
  }
  $$("[data-search]").forEach((box) => {
    const inp = $("input", box), res = $(".sres", box);
    const host = box.closest(".scard, .spanel") || box; // карточка главной / оверлей: пока есть результаты, прячем чипы
    const show = (on) => { res.hidden = !on; host.classList.toggle("has-res", on); };
    const render = (list) => {
      res.innerHTML = (list.length ? list.map((it) => `<a class="sitem" href="${link(it.u)}" role="option"><span class="sg">${esc(it.g)}</span><span><b>${esc(it.t)}</b><small>${esc(it.s)}</small></span><span class="msr ai" aria-hidden="true">arrow_forward</span></a>`).join("") : `<div class="snone">${T.none}</div>`)
        + `<div class="shint"><span>${T.hintEnter}</span><span>${T.hintEsc}</span></div>`;
      show(true);
    };
    const run = async () => { if (norm(inp.value).length < 2) { show(false); return; } await loadIdx(); render(search(inp.value)); };
    inp.addEventListener("focus", () => loadIdx(), { once: true });
    inp.addEventListener("input", run);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); const a = $(".sitem", res); if (a) location.href = a.href; else run(); } if (e.key === "Escape") show(false); });
    $("[data-search-go]", box).addEventListener("click", () => { const a = $(".sitem", res); if (a) location.href = a.href; else run(); });
    $$("[data-search-q]", box).forEach((b) => b.addEventListener("click", () => { inp.value = b.dataset.searchQ; inp.focus(); run(); }));
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) show(false); });
  });
  const sp = $("#spanel");
  if (sp) {
    const openS = () => { sp.classList.add("open"); document.body.style.overflow = "hidden"; setTimeout(() => $("input", sp).focus(), 60); };
    const closeS = () => { sp.classList.remove("open"); document.body.style.overflow = ""; };
    $("#hsearch").addEventListener("click", openS); $$("[data-search-open]").forEach((b) => b.addEventListener("click", () => { $("#mnav").classList.remove("open"); document.body.classList.remove("mn-open"); openS(); })); $("#spanelX").addEventListener("click", closeS);
    sp.addEventListener("click", (e) => { if (e.target === sp) closeS(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") closeS(); if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openS(); } });
  }
  // прайс: /prices?q=… — подставляем запрос из поиска
  if ($("#psearch")) { const q0 = new URLSearchParams(location.search).get("q"); if (q0) { $("#psearch").value = q0; $("#psearch").dispatchEvent(new Event("input")); setTimeout(() => $("#psearch").scrollIntoView({ block: "center", behavior: "smooth" }), 300); } }

  /* ── WhatsApp: ссылки [data-wa] с заготовленным текстом и страницей ── */
  const waHref = (txt) => (window.WA || "https://wa.me/77007110550") + "?text=" + encodeURIComponent(txt + "\n— " + document.title.split(" — ")[0] + "\n" + location.href.split("?")[0]);
  $$("[data-wa]").forEach((a) => { a.href = waHref(a.dataset.wa); a.target = "_blank"; a.rel = "noopener"; });

  /* ── подробная заявка на check-up ── */
  const cr = $("#cuReq");
  if (cr) {
    cr.addEventListener("click", (e) => {
      const b = e.target.closest(".pick button"); if (!b) return;
      const pk = b.parentElement;
      if (pk.hasAttribute("data-single")) $$("button", pk).forEach((x) => x.classList.toggle("on", x === b)); else b.classList.toggle("on");
    });
    const val = (k) => $$(`[data-pick="${k}"] button.on`, cr).map((b) => b.dataset.v);
    cr.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#cuName").value.trim(), phone = $("#cuPhone").value.trim();
      if (!$("#cuAgree").checked) { $("#cuAgree").focus(); $("#cuAgree").parentElement.style.color = "#B4342C"; return; }
      if (!name) { $("#cuName").focus(); $("#cuName").style.borderColor = "#B4342C"; return; }
      if (!phone || !window.phoneOk(phone)) { $("#cuPhone").focus(); $("#cuPhone").style.borderColor = "#B4342C"; return; }
      const utm = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => /^(utm_|gclid|ymclid|fbclid)/.test(k)));
      const payload = { type: "checkup", name, phone, program: val("program")[0] || "", format: val("format")[0] || "", who: val("who")[0] || "", sex: val("sex")[0] || "", age: val("age")[0] || "", goals: val("goals"), comment: $("#cuComment").value.trim(), date: $("#cuDate").value, time: val("time")[0] || "", channel: val("channel")[0] || "", promo: $("#cuPromo").value.trim(), agree: true, page: location.pathname, referrer: document.referrer, ...utm };
      const api = window.SITE_API ? window.SITE_API.replace(/\/$/, "") + "/lead" : null;
      $("#cuSubmit").disabled = true;
      const sent = await window.sendLead(api, payload);
      $("#cuSubmit").disabled = false;
      if (!sent) { window.leadFail(cr.querySelector(".note") || $("#cuSubmit").parentElement, T); return; }
      const sum = [payload.program, payload.format, payload.who, payload.sex, payload.age, payload.goals.join(", "), payload.date && (T.date + payload.date), payload.time].filter(Boolean).join(" · ");
      $("#cuDoneTxt").textContent = `${name ? name + ", " : ""}${sum}. ${T.confirm}${phone}.`;
      const wa = $("#cuDoneWa"); wa.href = (window.WA || "https://wa.me/77007110550") + "?text=" + encodeURIComponent(`${T.waCu}\n${sum}\n${T.tel}${phone}`); wa.target = "_blank";
      cr.hidden = true; $("#cuDone").hidden = false; $("#cuDone").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ── телефон: маска +7 (7xx) xxx-xx-xx и проверка перед отправкой ── */
  const fmtPhone = (v) => {
    let d = v.replace(/\D/g, "");
    if (d.startsWith("8")) d = "7" + d.slice(1);
    if (d && !d.startsWith("7")) d = "7" + d;
    d = d.slice(0, 11);
    if (!d) return "";
    let out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length >= 4) out += ") " + d.slice(4, 7);
    if (d.length >= 7) out += "-" + d.slice(7, 9);
    if (d.length >= 9) out += "-" + d.slice(9, 11);
    return out;
  };
  window.phoneOk = (v) => /^\+7 \(7\d\d\) \d{3}-\d\d-\d\d$/.test(v.trim());
  $$('input[inputmode="tel"]').forEach((inp) => {
    inp.setAttribute("maxlength", "18"); inp.placeholder = "+7 (7__) ___-__-__";
    inp.addEventListener("input", () => { const p = fmtPhone(inp.value); inp.value = p; inp.style.borderColor = ""; });
    inp.addEventListener("focus", () => { if (!inp.value) inp.value = "+7 ("; });
    inp.addEventListener("blur", () => { if (inp.value === "+7 (" || inp.value === "+7") inp.value = ""; if (inp.value && !window.phoneOk(inp.value)) inp.style.borderColor = "#B4342C"; });
    inp.addEventListener("keydown", (e) => { if (e.key === "Backspace" && inp.value.replace(/\D/g, "").length <= 1) { e.preventDefault(); inp.value = ""; } });
  });
})();
/* ── подменю раздела и боковые оглавления: подсветка активного пункта по прокрутке (макеты SubNav / Side TOC / Item TOC) ── */
(function () {
  const groups = Array.from(document.querySelectorAll(".subnav, [data-toc]"));
  if (!groups.length || !("IntersectionObserver" in window)) return;
  groups.forEach((g) => {
    const links = Array.from(g.querySelectorAll('a[href^="#"]'));
    const secs = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
    if (secs.length < 2) return;
    const set = (id) => links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + id));
    const io = new IntersectionObserver((en) => { en.forEach((x) => { if (x.isIntersecting) set(x.target.id); }); }, { rootMargin: "-30% 0px -60% 0px" });
    secs.forEach((s) => io.observe(s));
    links.forEach((a) => a.addEventListener("click", (e) => { const t = document.getElementById(a.getAttribute("href").slice(1)); if (!t) return; e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); set(t.id); history.replaceState(null, "", a.getAttribute("href")); }));
  });
})();
