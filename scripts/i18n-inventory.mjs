import fs from 'node:fs'; import path from 'node:path'; import { parse } from 'parse5';   // инвентаризация русских строк в сборке — для словаря казахской версии
const ROOT='/Users/zhainakabdyzhan/Desktop/interna-clinic/dist';
const walk=(d)=>fs.readdirSync(d).flatMap(f=>{const p=path.join(d,f);return fs.statSync(p).isDirectory()?walk(p):[p]});
const files=walk(ROOT).filter(f=>f.endsWith('.html') && !/\/(kk|admin)\//.test(f));
const count=new Map(); const SKIP=new Set(['script','style','noscript','template']);
const ATTRS=['alt','placeholder','aria-label','title'];
for (const f of files) {
  const doc=parse(fs.readFileSync(f,'utf8')); const seen=new Set();
  // пропускаем заглушки редиректов
  if (/Страница переехала/.test(fs.readFileSync(f,'utf8'))) continue;
  const w=(n)=>{ if(n.nodeName==='#text'){const t=n.value.replace(/\s+/g,' ').trim(); if(t.length>1 && /[А-Яа-яЁё]/.test(t) && t.length<400) seen.add(t); return;} if(SKIP.has(n.nodeName)) return; if(n.attrs) for(const a of n.attrs) if(ATTRS.includes(a.name)&&/[А-Яа-я]/.test(a.value)) seen.add(a.value.trim()); (n.childNodes||[]).forEach(w); };
  w(doc); for(const t of seen) count.set(t,(count.get(t)||0)+1);
}
const arr=[...count.entries()].sort((a,b)=>b[1]-a[1]);
fs.writeFileSync('/private/tmp/claude-501/-Users-zhainakabdyzhan-Desktop-interna-clinic/c1a2a03f-88f5-4685-af1a-1d5c8ef70718/scratchpad/inventory.json', JSON.stringify(arr));
console.log('pages',files.length,'| unique strings',arr.length,'| in ≥3 pages:',arr.filter(x=>x[1]>=3).length,'| ≥2:',arr.filter(x=>x[1]>=2).length);
console.log(arr.filter(x=>x[1]>=3).map(x=>x[1]+'× '+x[0]).join('\n'));
