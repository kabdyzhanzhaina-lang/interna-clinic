// Цены страниц /uslugi: только строки прайса клиники, явно привязанные к странице; нет строки — пусто («по запросу»)
import prices from '../data/prices.json';
const PRICE = { sedation: /^Внутривенная анестезия|анестезиолога/, hepatologist: /^Прием гепатолога/, cardiologist: /^Прием кардиолога|ЭКГ/, revmo: /^Прием ревматолога/, endoscopist: /^Консультация эндоскописта/, derma: /^Прием дерматолога/, allergy: /^Прием аллерголога/, ultra: /^УЗДГ/, station: /^Пребывание в стационаре \((?!.*check-up)/, surgeon: /^Прием хирурга/, nevro: /^Прием невропатолога/, psychologist: /^Прием психолога/, gematologist: /^Прием гематолога/, infection: /^Прием инфекциониста/, urologist: /^Прием уролога/, nefro: /^Прием нефролога/, diet: /^Прием диетолога/, childgastro: /^Прием детского гастроэнтеролога/, childendo: /^Прием детского эндокринолога/, ginecologist: /^Прием гинеколога/, inbody: /Inbody/, cardio_dia: /^Эхокардиография|^Стрейн эхокардиография|ЭКГ/, capsule: /^Видеокапсульная эндоскопия/, 'uzdg-head': /^УЗДГ сосудов шеи/, 'uzdg-legs': /^УЗДГ сосудов нижних конечностей/, biopsia: /^Биопсия|биопсии$/, 'ph-metr': /^Суточная pH-импедансометрия/ };
export function uslugiPrices(slug) {
  const re = PRICE[slug];
  if (re) return Object.values(prices).flat().filter((r) => re.test(r[0]) && /\d/.test(r[2])).slice(0, 4);
  if (slug === 'proccab') return prices['Процедурный кабинет'].filter((r) => /\d/.test(r[2])).slice(0, 4);
  return [];
}
