// Текстовый редактор: contenteditable ⇄ блоки сайта ["p", s] ["h", s] ["h3", s] ["q", s] ["ul", [..]] ["ol", [..]] ["tc", [[время, тема], ..]]
import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TC = /^(\d{1,2}:\d{2}(?::\d{2})?)\s*[—–-]?\s*(.*)$/;

export function toHtml(blocks = []) {
  return blocks.map(([t, v]) => {
    if (t === 'h') return `<h2>${esc(v)}</h2>`;
    if (t === 'h3') return `<h3>${esc(v)}</h3>`;
    if (t === 'q') return `<blockquote>${esc(v)}</blockquote>`;
    if (t === 'ul' || t === 'ol') return `<${t}>${v.map((x) => `<li>${esc(x)}</li>`).join('')}</${t}>`;
    if (t === 'tc') return `<ul class="tc">${v.map(([a, b]) => `<li>${esc(a)} — ${esc(b)}</li>`).join('')}</ul>`;
    return `<p>${esc(v)}</p>`;
  }).join('');
}

const text = (el) => (el.innerText ?? el.textContent).replace(/ /g, ' ').replace(/\s*\n\s*/g, ' ').trim();

export function fromDom(root) {
  const out = [];
  const lis = (el) => [...el.children].filter((c) => c.tagName === 'LI').map(text).filter(Boolean);
  for (const n of root.childNodes) {
    if (n.nodeType === 3) { const s = n.textContent.trim(); if (s) out.push(['p', s]); continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.tagName;
    if (tag === 'UL' && n.classList.contains('tc')) {
      const rows = lis(n).map((s) => { const m = TC.exec(s); return m ? [m[1], m[2].trim()] : ['', s]; });
      if (rows.length) out.push(['tc', rows]);
    } else if (tag === 'UL' || tag === 'OL') { const items = lis(n); if (items.length) out.push([tag.toLowerCase(), items]); }
    else if (tag === 'H1' || tag === 'H2') { const s = text(n); if (s) out.push(['h', s]); }
    else if (tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6') { const s = text(n); if (s) out.push(['h3', s]); }
    else if (tag === 'BLOCKQUOTE') { const s = text(n); if (s) out.push(['q', s]); }
    else if (tag !== 'BR') { const s = text(n); if (s) out.push(['p', s]); }
  }
  return out;
}

const VARIANTS = {
  // карточка врача на сайте понимает только подзаголовки, списки и абзацы
  doctor: [['p', 'Текст', 'format_paragraph'], ['h3', 'Заголовок', 'title'], ['ul', 'Список', 'format_list_bulleted']],
  article: [['p', 'Текст', 'format_paragraph'], ['h', 'Заголовок', 'title'], ['h3', 'Подзаголовок', 'text_fields'], ['ul', 'Список', 'format_list_bulleted'], ['ol', 'Нумерация', 'format_list_numbered'], ['q', 'Цитата', 'format_quote'], ['tc', 'Тайм-коды', 'schedule']],
};
const BLOCK_TAG = { p: 'P', h: 'H2', h3: 'H3', q: 'BLOCKQUOTE' };

/** Определить тип блока под курсором */
function current(root) {
  const sel = getSelection();
  if (!sel.rangeCount || !root.contains(sel.anchorNode)) return null;
  let n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
  while (n && n !== root && n.parentNode !== root) n = n.parentNode;
  if (!n || n === root) return 'p';
  if (n.tagName === 'UL') return n.classList.contains('tc') ? 'tc' : 'ul';
  return { OL: 'ol', H2: 'h', H1: 'h', H3: 'h3', BLOCKQUOTE: 'q' }[n.tagName] || 'p';
}

export function RichText({ value, onChange, variant = 'article', placeholder = 'Начните писать…', hint }) {
  const ref = useRef();
  const last = useRef(null);
  const [cur, setCur] = useState(null);
  const tools = VARIANTS[variant];

  useEffect(() => {
    const json = JSON.stringify(value || []);
    if (json !== last.current) { ref.current.innerHTML = toHtml(value); last.current = json; }
  }, [value]);

  useEffect(() => {
    const onSel = () => ref.current && setCur(current(ref.current));
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  const emit = () => {
    const blocks = fromDom(ref.current);
    if (!ref.current.textContent.trim()) ref.current.innerHTML = '';
    last.current = JSON.stringify(blocks);
    onChange(blocks);
  };

  const apply = (t) => {
    ref.current.focus();
    document.execCommand('defaultParagraphSeparator', false, 'p');
    const now = current(ref.current);
    if (t === 'ul' || t === 'ol') {
      if (now === 'tc') { const ul = blockEl(); ul.classList.remove('tc'); if (t === 'ol') document.execCommand('insertOrderedList'); }
      else document.execCommand(t === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
    } else if (t === 'tc') {
      if (now === 'ul') blockEl().classList.add('tc');
      else {
        if (now === 'ol') document.execCommand('insertOrderedList');
        document.execCommand('insertUnorderedList');
        blockEl()?.classList.add('tc');
      }
    } else {
      if (now === 'ul' || now === 'ol' || now === 'tc') document.execCommand(now === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
      document.execCommand('formatBlock', false, `<${BLOCK_TAG[t]}>`);
    }
    emit();
    setCur(current(ref.current));
  };
  const blockEl = () => {
    let n = getSelection().anchorNode;
    while (n && n.parentNode !== ref.current) n = n.parentNode;
    return n;
  };

  const onPaste = (e) => {
    e.preventDefault();
    const s = e.clipboardData.getData('text/plain');
    const paras = s.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    if (paras.length > 1) document.execCommand('insertHTML', false, paras.map((p) => `<p>${esc(p.replace(/\s*\n\s*/g, ' '))}</p>`).join(''));
    else document.execCommand('insertText', false, s.replace(/\s*\n\s*/g, ' '));
  };

  const onKey = (e) => {
    // «/» в пустой строке — подсказка по блокам; горячие клавиши для быстрых форматов
    if ((e.metaKey || e.ctrlKey) && e.altKey && /^Digit[1-3]$/.test(e.code)) { e.preventDefault(); apply(['p', 'h', 'h3'][+e.code.slice(-1) - 1] || 'p'); }
  };

  return html`<div class="rich">
    <div class="tools">
      ${tools.map(([t, label, icon], i) => html`${i === 1 || (i === 3 && variant === 'article') ? html`<span class="sep"></span>` : ''}<button type="button" class=${cur === t ? 'on' : ''} onMouseDown=${(e) => { e.preventDefault(); apply(t); }} title=${label}><span class="msr">${icon}</span>${label}</button>`)}
    </div>
    <div ref=${ref} class="rich-area" contenteditable="true" data-ph=${placeholder} onInput=${emit} onPaste=${onPaste} onKeyDown=${onKey}></div>
    ${hint && html`<div class="rich-hint">${hint}</div>`}
  </div>`;
}

export const wordCount = (blocks = []) => blocks.map(([t, v]) => (t === 'tc' ? '' : Array.isArray(v) ? v.join(' ') : v)).join(' ').split(/\s+/).filter(Boolean).length;
