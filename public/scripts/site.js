/* Interna Clinic — клиентские механики. Без библиотек. Уважает prefers-reduced-motion. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SLOTS = [["14:30", "сегодня"], ["16:00", "сегодня"], ["09:15", "завтра"], ["11:00", "завтра"], ["13:45", "завтра"], ["18:20", "завтра"]];

  /* ── появление при прокрутке ── */
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "-40px 0px" });
    $$(".rv").forEach((e) => { if (e.getBoundingClientRect().top < innerHeight * 0.9) e.classList.add("in"); else io.observe(e); });
  } else $$(".rv").forEach((e) => e.classList.add("in"));

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
    cont.addEventListener("click", (e) => { const b = e.target.closest(".slot"); if (!b) return; $$(".slot", cont).forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); if (btn) btn.textContent = "Забронировать " + b.firstChild.nodeValue.trim(); });
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
    $$("#docgrid [data-doc-cat]").forEach((card) => { card.hidden = !(cat === "all" || card.dataset.docCat === cat); });
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
    $("#cuNote").textContent = stac ? "Стационарный формат: палата, наблюдение врача, питание и процедуры включены. К цене программы добавляется стационар — от 35 000 ₸ за сутки дневного или от 60 000 ₸ за сутки круглосуточного." : "Амбулаторный формат: приезжаете утром натощак, к вечеру — результаты и разбор с врачом.";
    $$("[data-cu] .ft b").forEach((el) => { if (!el.dataset.base) el.dataset.base = el.textContent; el.textContent = stac ? el.dataset.base + " + стационар" : el.dataset.base; });
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
        $("#quizres").innerHTML = `Ваша программа: <b>${best.dataset.title}</b> — ${best.dataset.price}. <button type="button" class="btn btn-primary sm" data-book data-svc="Check-up" style="margin-left:8px">Записаться</button>`;
        cards.forEach((c) => { c.style.outline = c === best ? "3px solid var(--blue)" : ""; c.style.outlineOffset = "4px"; });
      }
    });
  }

  /* ── подготовка: вкладки ── */
  const prep = $("#preptabs");
  if (prep) prep.addEventListener("click", (e) => {
    const b = e.target.closest("[data-prep]"); if (!b) return;
    $$(".chip", prep).forEach((c) => c.classList.toggle("on", c === b));
    $$("[data-prep-set]").forEach((s) => (s.hidden = s.dataset.prepSet !== b.dataset.prep));
  });

  /* ── параллакс при скролле (как в редакционных лонгридах): data-parallax="0.2" ── */
  const px = $$("[data-parallax]");
  if (px.length && !reduce) {
    let pt = false;
    const upd = () => {
      const vc = innerHeight / 2;
      px.forEach((el) => {
        const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return;
        const d = (r.top + r.height / 2 - vc) * parseFloat(el.dataset.parallax || "0.2");
        el.style.transform = `translate3d(0, ${(-d).toFixed(1)}px, 0)` + (el.dataset.parallaxScale ? ` scale(${el.dataset.parallaxScale})` : "");
      });
    };
    addEventListener("scroll", () => { if (!pt) { pt = true; requestAnimationFrame(() => { upd(); pt = false; }); } }, { passive: true }); upd();
  }
  /* ── прогресс чтения статьи ── */
  const prog = $("#readprog");
  if (prog) addEventListener("scroll", () => { const a = $(".article .body"); if (!a) return; const r = a.getBoundingClientRect(); const total = r.height - innerHeight * 0.6; const p = Math.min(1, Math.max(0, -r.top / (total <= 0 ? 1 : total))); prog.style.width = (p * 100).toFixed(1) + "%"; }, { passive: true });

  /* ── свечение кнопок ── */
  document.addEventListener("pointermove", (e) => { const b = e.target.closest && e.target.closest(".btn"); if (!b) return; const r = b.getBoundingClientRect(); b.style.setProperty("--mx", e.clientX - r.left + "px"); b.style.setProperty("--my", e.clientY - r.top + "px"); });

  /* ── шапка, FAB, параллакс ── */
  let hTick = false;
  addEventListener("scroll", () => { if (hTick) return; hTick = true; requestAnimationFrame(() => { $("#hdr").classList.toggle("stuck", scrollY > 40); document.body.classList.toggle("scrolled", scrollY > 600); hTick = false; }); }, { passive: true });
  addEventListener("pointermove", (e) => { if (reduce) return; const h = $("#hero"); if (!h) return; const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5; $$(".blob", h).forEach((b, i) => { b.style.translate = `${x * (i ? -30 : 40)}px ${y * (i ? -24 : 30)}px`; }); });

  /* ── мобильное меню + дропдаун ── */
  $("#burger").addEventListener("click", () => $("#mnav").classList.add("open"));
  $("#mnavX").addEventListener("click", () => $("#mnav").classList.remove("open"));
  const w = $("#ddWrap");
  if (w) {
    w.querySelector("a").addEventListener("click", (e) => { if (matchMedia("(hover:none)").matches && !w.classList.contains("open")) { e.preventDefault(); w.classList.add("open"); } });
    document.addEventListener("click", (e) => { if (!w.contains(e.target)) w.classList.remove("open"); });
  }

  /* ── модалка записи ── */
  const modal = $("#modal");
  const syncFormat = () => { $("#mFormatWrap").hidden = !/check-up/i.test($("#mSvc").value); };
  function openModal(svc) {
    modal.classList.add("open"); $("#mform").hidden = false; $("#mdone").hidden = true; renderSlots($("#mslots"), null, 6);
    if (svc) { const o = [...$("#mSvc").options].find((o) => o.text === svc); if (o) $("#mSvc").value = o.text; }
    syncFormat(); document.body.style.overflow = "hidden";
  }
  const closeModal = () => { modal.classList.remove("open"); document.body.style.overflow = ""; };
  $("#mSvc").addEventListener("change", syncFormat);
  $("#mFormat").addEventListener("click", (e) => { const b = e.target.closest("[data-fmt]"); if (!b) return; $$("#mFormat button").forEach((x) => x.classList.toggle("on", x === b)); });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-book]"); if (b) { e.preventDefault(); openModal(b.dataset.svc); } });
  $("#modalX").addEventListener("click", closeModal); $("#mClose2").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); $("#mnav").classList.remove("open"); } });
  $("#mSubmit").addEventListener("click", async () => {
    const name = $("#mName").value.trim(), phone = $("#mPhone").value.trim();
    if (!$("#mAgree").checked) { $("#mAgree").focus(); $("#mAgree").parentElement.style.color = "#B4342C"; return; }
    if (!phone) { $("#mPhone").focus(); $("#mPhone").style.borderColor = "#B4342C"; return; }
    const slot = $('#mslots .slot[aria-pressed="true"]'); const st = slot ? slot.firstChild.nodeValue.trim() + ", " + $("small", slot).textContent : "ближайшее время";
    const fmt = $("#mFormatWrap").hidden ? "" : " (" + $("#mFormat .on").dataset.fmt.toLowerCase() + ")";
    const payload = { name, phone, service: $("#mSvc").value + fmt, slot: st, agree: true, page: location.pathname };
    try { await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); } catch (_) { /* демо-режим без бэкенда */ }
    $("#mdoneTxt").textContent = `${name ? name + ", " : ""}${$("#mSvc").value}${fmt} — ${st}. Подтверждение отправим на ${phone}.`;
    $("#mform").hidden = true; $("#mdone").hidden = false;
  });
})();
