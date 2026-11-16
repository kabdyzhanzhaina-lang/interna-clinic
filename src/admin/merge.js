// Трёхстороннее объединение: base — файл, каким его загрузили; mine — черновик; theirs — файл сейчас (его успел опубликовать коллега).
// Объекты сливаются по ключам, списки записей — по id, остальное (тексты, списки без id) — целиком.
// Конфликт — когда одно и то же место поменяли оба и по-разному: тогда возвращаем, где именно.

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function idOf(arr, idKey) {
  if (!Array.isArray(arr) || !arr.every((x) => isObj(x) && x[idKey] != null)) return null;
  const ids = arr.map((x) => String(x[idKey]));
  return new Set(ids).size === ids.length ? ids : null;
}

/**
 * @param name — подпись места для сообщения о конфликте: (path, value) → строка
 * @returns {{ value, conflicts: string[] }}
 */
export function merge3(base, mine, theirs, { idKey = 'id', name = (p) => p.join(' → ') } = {}) {
  const conflicts = [];
  const walk = (b, m, t, path) => {
    if (same(m, b)) return t;
    if (same(t, b) || same(m, t)) return m;
    if (isObj(b) && isObj(m) && isObj(t)) {
      const out = {};
      // порядок ключей — как в черновике, новые ключи коллеги — в конце
      for (const k of [...new Set([...Object.keys(m), ...Object.keys(t), ...Object.keys(b)])]) {
        const v = walk(b[k], m[k], t[k], [...path, k]);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    const bi = idOf(b, idKey), mi = idOf(m, idKey), ti = idOf(t, idKey);
    if (bi && mi && ti) {
      const B = new Map(b.map((x) => [String(x[idKey]), x])), M = new Map(m.map((x) => [String(x[idKey]), x])), T = new Map(t.map((x) => [String(x[idKey]), x]));
      const out = [];
      for (const id of mi) {
        if (!B.has(id)) { out.push(M.get(id)); continue; }                     // добавили мы
        if (!T.has(id)) {                                                      // коллега удалил
          if (!same(M.get(id), B.get(id))) conflicts.push(name([...path, id], M.get(id)));
          continue;
        }
        out.push(walk(B.get(id), M.get(id), T.get(id), [...path, id]));
      }
      for (const id of bi) if (!M.has(id) && T.has(id) && !same(T.get(id), B.get(id))) conflicts.push(name([...path, id], T.get(id))); // мы удалили, коллега правил
      // записи, добавленные коллегой, — на их место после соседа сверху
      ti.forEach((id, i) => {
        if (B.has(id) || M.has(id)) return;
        const prev = ti.slice(0, i).reverse().find((p) => out.some((x) => String(x[idKey]) === p));
        const at = prev ? out.findIndex((x) => String(x[idKey]) === prev) + 1 : 0;
        out.splice(at, 0, T.get(id));
      });
      return out;
    }
    // список без id (вопросы, отзывы): если никто не добавлял и не удалял — сливаем по позиции
    if (Array.isArray(b) && Array.isArray(m) && Array.isArray(t) && b.length === m.length && b.length === t.length) {
      return b.map((x, i) => walk(x, m[i], t[i], [...path, i]));
    }
    conflicts.push(name(path, m ?? t));
    return m;
  };
  const value = walk(base, mine, theirs, []);
  return { value, conflicts: [...new Set(conflicts)] };
}
