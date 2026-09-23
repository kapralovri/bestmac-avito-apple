/**
 * Цены страниц выкупа моделей /sell/<модель> (GST-78, docs/sell-model-pages-GST-78.md).
 *
 * Страница находит свои строки в базе не по названию (названия каталога и базы
 * разные), а по семейству, диагонали и чипу — после GST-77 процессор строки
 * записан с уровнем чипа. Показывать цифру можно только по надёжной
 * конфигурации: иначе клиент получит цену по трём объявлениям полугодовой давности.
 *
 * Чистые функции без рантайм-импортов: тесты (tests/sell-prices.test.ts)
 * запускаются голым `node --test`.
 */
import type { AvitoPriceStat } from '@/types/avito-prices';
import type { SellMatch } from '@/lib/model-slugs';

export const MIN_SAMPLES = 5;
export const FRESH_DAYS = 30;

export interface SellConfig {
  processor: string;
  ram: number;
  ssd: number;
  buyoutPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  samplesCount: number;
  updatedAt: string;
  manual: boolean;
  reliable: boolean;
}

export interface SellModelPrices {
  configs: SellConfig[];        // все конфигурации модели, по памяти и диску
  reliable: SellConfig[];       // только надёжные — таблица и FAQ
  maxBuyout: number;            // «до X ₽»; 0 — надёжных нет
  reliableSamples: number;      // сумма объявлений надёжных строк
  latestUpdate: string | null;  // updated_at самой свежей надёжной строки
  sourceModelNames: string[];   // названия строк базы — для ссылки на /ceny
}

const DAY_MS = 86_400_000;
const NBSP = ' ';

/** Возраст строки в днях. Понимает формат базы и старый формат парсера. */
export function ageDays(updatedAt: string, now: Date): number | null {
  const iso = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(updatedAt || '');
  const t = iso ? Date.parse(`${iso[1]}T${iso[2]}:00`) : Date.parse(updatedAt || '');
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

/** Диагональ из названия строки; null — строка не этого семейства. */
function screenOf(name: string, family: string): number | undefined | null {
  if (!name.toLowerCase().startsWith(family.toLowerCase())) return null;
  const rest = name.slice(family.length);
  if (rest && !/^\s/.test(rest)) return null;
  const m = /^\s+(\d{2})(?!\d)/.exec(rest);
  return m ? Number(m[1]) : undefined;
}

function processorFor(chip: string): string {
  return chip === 'Intel' ? 'Intel' : `Apple ${chip}`;
}

/**
 * Самый большой диск, который бывает у модели. Парсер иногда путает объём
 * (iMac 24 «8 ТБ»), а правило порядка цен такую строку не ловит: 8/8192 не
 * сравнима с 16/256. Mac Studio с M3 Ultra бывает до 16 ТБ.
 */
function maxSsd(match: SellMatch): number {
  const baseChip = !/ (Pro|Max|Ultra)$/.test(match.chip);
  if (match.family === 'MacBook Air') return 2048;
  if (match.family === 'iMac' && match.chip !== 'Intel') return 2048;
  if (match.family === 'Mac mini' && baseChip) return 2048;
  if (match.family === 'MacBook Pro' && match.screen === 13) return 2048;
  return 16384;
}

/** Строки базы, относящиеся к модели. Сводки 0/0 — не конфигурации. */
export function matchRows(stats: AvitoPriceStat[], match: SellMatch): AvitoPriceStat[] {
  const processor = processorFor(match.chip);
  const ssdLimit = maxSsd(match);
  return stats.filter((s) => {
    if (!(s.ram > 0 && s.ssd > 0) || s.ssd > ssdLimit) return false;
    const screen = screenOf(s.model_name || '', match.family);
    if (screen === null || screen !== match.screen) return false;
    return s.processor === processor;
  });
}

/**
 * Какую из строк одной конфигурации оставить — тот же приоритет, что у склейки
 * базы в GST-77 (scripts/common/price_identity.py, pick_winner): ручная цена →
 * свежая с выборкой → больше выборка → новее.
 */
function rank(s: AvitoPriceStat, now: Date): number[] {
  const age = ageDays(s.updated_at || '', now);
  const n = s.samples_count || 0;
  const fresh = age !== null && age <= FRESH_DAYS && n >= MIN_SAMPLES;
  return [s.manual_override ? 1 : 0, fresh ? 1 : 0, n, -(age ?? 1e6)];
}

function better(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

function toConfig(s: AvitoPriceStat): SellConfig {
  return {
    processor: s.processor,
    ram: s.ram,
    ssd: s.ssd,
    buyoutPrice: s.buyout_price,
    medianPrice: s.median_price,
    minPrice: s.min_price,
    maxPrice: s.max_price,
    samplesCount: s.samples_count || 0,
    updatedAt: s.updated_at || '',
    manual: Boolean(s.manual_override),
    reliable: false,
  };
}

/**
 * Конфигурация с большей (или равной) памятью и диском не может стоить меньше.
 * Такая пара противоречит сама себе: снимаем строку с меньшей выборкой —
 * у неё выше шанс оказаться шумом. Ручная цена владельца не снимается.
 */
function dropPriceInversions(configs: SellConfig[]): void {
  for (;;) {
    const rel = configs.filter((c) => c.reliable);
    let loser: SellConfig | null = null;
    for (const a of rel) {
      for (const b of rel) {
        const bigger = b.ram >= a.ram && b.ssd >= a.ssd && (b.ram > a.ram || b.ssd > a.ssd);
        if (!bigger || b.buyoutPrice >= a.buyoutPrice || (a.manual && b.manual)) continue;
        loser = a.manual ? b : b.manual ? a : b.samplesCount < a.samplesCount ? b : a;
        break;
      }
      if (loser) break;
    }
    if (!loser) return;
    loser.reliable = false;
  }
}

export function buildSellModelPrices(
  stats: AvitoPriceStat[] | null | undefined,
  match: SellMatch | undefined,
  now: Date,
): SellModelPrices {
  const byConfig = new Map<string, AvitoPriceStat>();
  if (match) {
    for (const s of matchRows(stats || [], match)) {
      const key = `${s.ram}/${s.ssd}`;
      const prev = byConfig.get(key);
      if (!prev || better(rank(s, now), rank(prev, now))) byConfig.set(key, s);
    }
  }
  const configs = [...byConfig.values()].map(toConfig).sort((a, b) => a.ram - b.ram || a.ssd - b.ssd);
  for (const c of configs) {
    const age = ageDays(c.updatedAt, now);
    c.reliable = c.manual || (c.samplesCount >= MIN_SAMPLES && age !== null && age <= FRESH_DAYS);
  }
  dropPriceInversions(configs);

  const reliable = configs.filter((c) => c.reliable);
  // Выборка и дата — только по рыночным строкам: ручная цена — цифра владельца,
  // а не «объявления за последние 30 дней».
  const market = reliable.filter((c) => !c.manual);
  let latest: SellConfig | null = null;
  for (const c of market) {
    const age = ageDays(c.updatedAt, now);
    if (age !== null && (!latest || age < (ageDays(latest.updatedAt, now) ?? Infinity))) latest = c;
  }
  return {
    configs,
    reliable,
    maxBuyout: reliable.reduce((m, c) => Math.max(m, c.buyoutPrice), 0),
    reliableSamples: market.reduce((n, c) => n + c.samplesCount, 0),
    latestUpdate: latest ? latest.updatedAt : null,
    sourceModelNames: [...new Set([...byConfig.values()].map((s) => s.model_name))],
  };
}

export function formatRub(n: number): string {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}₽`;
}

export function formatStorage(gb: number): string {
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} ТБ` : `${gb} ГБ`;
}

export function configLabel(c: { ram: number; ssd: number }): string {
  return `${c.ram} ГБ / ${formatStorage(c.ssd)}`;
}

// ─── Калькулятор: процессор на странице один, выбираются память и диск ───────

export function ramOptions(configs: SellConfig[]): number[] {
  return [...new Set(configs.map((c) => c.ram))].sort((a, b) => a - b);
}

export function ssdOptions(configs: SellConfig[], ram: number): number[] {
  return [...new Set(configs.filter((c) => c.ram === ram).map((c) => c.ssd))].sort((a, b) => a - b);
}

export function findConfig(configs: SellConfig[], ram: number, ssd: number): SellConfig | undefined {
  return configs.find((c) => c.ram === ram && c.ssd === ssd);
}

// ─── FAQ модели из данных ────────────────────────────────────────────────────
// Раньше у всех 31 страницы был один общий FAQ — Яндекс видел их одинаковыми.
// Вопросы с цифрами модели делают страницу своей и обновляются вместе с ценами.

export interface FaqItem {
  question: string;
  answer: string;
}

function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

/** «по N объявлениям» — дательный падеж. */
function byListings(n: number): string {
  return `по ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'объявлению' : 'объявлениям'}`;
}

export function buildModelFaq(shortName: string, prices: SellModelPrices): FaqItem[] {
  const priceQuestion = `Сколько стоит выкуп ${shortName}?`;
  if (!prices.reliable.length) {
    return [{
      question: priceQuestion,
      answer: 'Свежих объявлений по этой модели мало, поэтому цену назовём по фото за 15 минут.',
    }];
  }
  const rel = prices.reliable;
  const top = rel.reduce((a, b) => (b.buyoutPrice > a.buyoutPrice ? b : a));
  const cheap = rel.reduce((a, b) => (b.buyoutPrice < a.buyoutPrice ? b : a));
  const market = rel.filter((c) => !c.manual);
  const common = market.length ? market.reduce((a, b) => (b.samplesCount > a.samplesCount ? b : a)) : null;

  const faq: FaqItem[] = [{
    question: priceQuestion,
    answer: prices.reliableSamples > 0
      ? `До ${formatRub(top.buyoutPrice)} за ${configLabel(top)}. Цена ${byListings(prices.reliableSamples)} ` +
        'на Авито за последние 30 дней; точную сумму назовём после осмотра.'
      : `До ${formatRub(top.buyoutPrice)} за ${configLabel(top)}. Точную сумму назовём после осмотра.`,
  }];
  if (rel.length >= 2) {
    faq.push({
      question: `Как память и диск влияют на цену ${shortName}?`,
      answer: `${configLabel(cheap)} — до ${formatRub(cheap.buyoutPrice)}, ${configLabel(top)} — до ${formatRub(top.buyoutPrice)}.`,
    });
  }
  if (!common) return faq;
  faq.push({
    question: `Какая конфигурация ${shortName} встречается чаще всего?`,
    answer: `${configLabel(common)} — ${common.samplesCount} ` +
      `${plural(common.samplesCount, 'объявление', 'объявления', 'объявлений')} на Авито за последние 30 дней. ` +
      `Её выкупаем до ${formatRub(common.buyoutPrice)}.`,
  });
  return faq;
}

// ─── Сводка по моделям для /vykup и /sell ───────────────────────────────────
// Посадочные страницы выкупа показывали цены только в браузере. Сводка «до X ₽»
// по моделям с надёжными ценами попадает в HTML и ведёт на страницы моделей.

export interface ModelPriceSummary {
  name: string;
  slug: string;
  family: string;
  maxBuyout: number;
  configs: number; // надёжных конфигураций
}

export function modelPriceSummaries(
  stats: AvitoPriceStat[] | null | undefined,
  catalog: Array<{ name: string; slug: string; match: SellMatch }>,
  now: Date,
): ModelPriceSummary[] {
  const out: ModelPriceSummary[] = [];
  for (const m of catalog) {
    const p = buildSellModelPrices(stats, m.match, now);
    if (!p.reliable.length) continue;
    out.push({ name: m.name, slug: m.slug, family: m.match.family, maxBuyout: p.maxBuyout, configs: p.reliable.length });
  }
  return out;
}
