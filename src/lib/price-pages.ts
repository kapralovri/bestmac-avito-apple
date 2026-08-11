/**
 * Данные для программных ценовых страниц (/ceny, /ceny/[model_slug]).
 *
 * Источник — public/data/avito-prices.json (.stats), тот же файл, что питает
 * выкуп-калькулятор. Обновляется парсером (avito-parser.yml, 4×/сутки) → пуш
 * `chore: update prices` → пересборка на Vercel → SSG-HTML со свежими ценами.
 * Отдельный cron для страниц не нужен: они читают JSON на этапе сборки.
 *
 * Слоги генерируются напрямую из model_name реальных данных, поэтому каждая
 * сгенерированная страница гарантированно имеет цены (sitemap == маршрут ==
 * canonical == есть данные, без soft-404 и дублей).
 */

import type { AvitoPriceStat } from '@/types/avito-prices';
import { loadAvitoPricesServer } from '@/lib/server-prices';
import { modelToSlug } from '@/lib/model-slugs';

export interface ModelConfig {
  processor: string;
  ram: number;
  ssd: number;
  minPrice: number;
  medianPrice: number;
  maxPrice: number;
  samplesCount: number;
}

export interface ModelPrice {
  modelName: string;      // сырое имя из данных: "MacBook Pro 14 (2024)"
  displayName: string;    // причёсанное: "MacBook Pro 14 (2024)"
  slug: string;           // "macbook-pro-14-2024"
  family: FamilyGroup;
  minPrice: number;       // минимум по всем строкам модели
  medianPrice: number;    // медиана медиан конфигураций
  maxPrice: number;       // максимум по всем строкам
  buyoutPrice: number;    // ориентир выкупа (медиана buyout по конфигурациям)
  samplesCount: number;   // суммарное число объявлений
  updatedAt: string;      // самая свежая дата обновления среди строк
  configs: ModelConfig[]; // построчная разбивка по процессору/RAM/SSD
}

export type FamilyGroup =
  | 'MacBook Air'
  | 'MacBook Pro'
  | 'iMac'
  | 'Mac mini'
  | 'Mac Studio'
  | 'Mac';

export const FAMILY_ORDER: FamilyGroup[] = [
  'MacBook Air',
  'MacBook Pro',
  'iMac',
  'Mac mini',
  'Mac Studio',
  'Mac',
];

/**
 * Причёсывает разнородные model_name из данных парсера в человекочитаемый вид:
 *   "mac mini m1" → "Mac mini M1", "imac 24" → "iMac 24",
 *   "Mac Studio m4" → "Mac Studio M4".
 */
export function prettyModelName(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\bmacbook air\b/i, 'MacBook Air');
  s = s.replace(/\bmacbook pro\b/i, 'MacBook Pro');
  s = s.replace(/\bmac studio\b/i, 'Mac Studio');
  s = s.replace(/\bmac mini\b/i, 'Mac mini');
  s = s.replace(/\bimac\b/i, 'iMac');
  // m1..m9 → M1..M9 (обозначение чипа)
  s = s.replace(/\bm([1-9])\b/g, (_, d) => `M${d}`);
  // pro / max / ultra → Pro / Max / Ultra
  s = s.replace(/\b(pro|max|ultra)\b/gi, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return s;
}

function familyOf(pretty: string): FamilyGroup {
  if (/^MacBook Air/i.test(pretty)) return 'MacBook Air';
  if (/^MacBook Pro/i.test(pretty)) return 'MacBook Pro';
  if (/^iMac/i.test(pretty)) return 'iMac';
  if (/^Mac mini/i.test(pretty)) return 'Mac mini';
  if (/^Mac Studio/i.test(pretty)) return 'Mac Studio';
  return 'Mac';
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/** Парсит разнородные форматы даты updated_at в timestamp (0 при неудаче). */
function parseTime(s: string): number {
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

function toModelPrice(modelName: string, rows: AvitoPriceStat[]): ModelPrice {
  const mins = rows.map((r) => r.min_price).filter((n) => n > 0);
  const maxes = rows.map((r) => r.max_price).filter((n) => n > 0);
  const medians = rows.map((r) => r.median_price).filter((n) => n > 0);
  const buyouts = rows.map((r) => r.buyout_price).filter((n) => n > 0);

  // Конфигурации для таблицы: только строки с явной RAM/SSD; сортировка
  // по RAM, затем SSD, затем процессору — предсказуемый порядок в HTML.
  const configs: ModelConfig[] = rows
    .filter((r) => r.ram > 0 || r.ssd > 0)
    .map((r) => ({
      processor: r.processor || '',
      ram: r.ram,
      ssd: r.ssd,
      minPrice: r.min_price,
      medianPrice: r.median_price,
      maxPrice: r.max_price,
      samplesCount: r.samples_count,
    }))
    .sort((a, b) => a.ram - b.ram || a.ssd - b.ssd || a.processor.localeCompare(b.processor));

  const latest = rows.reduce(
    (acc, r) => (parseTime(r.updated_at) > parseTime(acc) ? r.updated_at : acc),
    rows[0]?.updated_at ?? '',
  );

  const display = prettyModelName(modelName);

  return {
    modelName,
    displayName: display,
    slug: modelToSlug(modelName),
    family: familyOf(display),
    minPrice: mins.length ? Math.min(...mins) : 0,
    medianPrice: median(medians),
    maxPrice: maxes.length ? Math.max(...maxes) : 0,
    buyoutPrice: median(buyouts),
    samplesCount: rows.reduce((sum, r) => sum + (r.samples_count || 0), 0),
    updatedAt: latest,
    configs,
  };
}

let cache: ModelPrice[] | null = null;

/**
 * Все модели с ценами, сгруппированные по model_name. Кэшируется в пределах
 * процесса сборки (страницы читают один и тот же снимок данных).
 */
export async function getAllModelPrices(): Promise<ModelPrice[]> {
  if (cache) return cache;

  const data = await loadAvitoPricesServer();
  if (!data?.stats?.length) {
    cache = [];
    return cache;
  }

  const byModel = new Map<string, AvitoPriceStat[]>();
  for (const stat of data.stats) {
    if (!stat.model_name) continue;
    const arr = byModel.get(stat.model_name);
    if (arr) arr.push(stat);
    else byModel.set(stat.model_name, [stat]);
  }

  const models = [...byModel.entries()]
    .map(([name, rows]) => toModelPrice(name, rows))
    // Отсекаем модели без реальных цен (не создаём пустых страниц).
    .filter((m) => m.minPrice > 0 && m.maxPrice > 0);

  // Стабильный порядок: по семейству, затем по названию.
  models.sort((a, b) => {
    const fa = FAMILY_ORDER.indexOf(a.family);
    const fb = FAMILY_ORDER.indexOf(b.family);
    return fa - fb || a.displayName.localeCompare(b.displayName, 'ru');
  });

  cache = models;
  return cache;
}

/** Одна модель по slug (или undefined). */
export async function getModelPriceBySlug(slug: string): Promise<ModelPrice | undefined> {
  const all = await getAllModelPrices();
  return all.find((m) => m.slug === slug);
}

/** Слоги всех ценовых страниц — для generateStaticParams и sitemap. */
export async function getPriceModelSlugs(): Promise<string[]> {
  const all = await getAllModelPrices();
  return all.map((m) => m.slug);
}

/** Дата генерации снимка цен (для lastmod / priceValidUntil). */
export async function getPricesGeneratedAt(): Promise<string | undefined> {
  const data = await loadAvitoPricesServer();
  return data?.generated_at;
}

/** Модели, сгруппированные по семейству, в порядке FAMILY_ORDER. */
export function groupByFamily(models: ModelPrice[]): Array<{ family: FamilyGroup; models: ModelPrice[] }> {
  const groups = new Map<FamilyGroup, ModelPrice[]>();
  for (const m of models) {
    const arr = groups.get(m.family);
    if (arr) arr.push(m);
    else groups.set(m.family, [m]);
  }
  return FAMILY_ORDER.filter((f) => groups.has(f)).map((family) => ({
    family,
    models: groups.get(family)!,
  }));
}

/** Форматирование конфигурации: "16 ГБ / 512 ГБ" (SSD 1024→"1 ТБ"). */
export function formatConfig(ram: number, ssd: number): string {
  const parts: string[] = [];
  if (ram > 0) parts.push(`${ram} ГБ`);
  if (ssd > 0) parts.push(ssd >= 1024 ? `${ssd / 1024} ТБ` : `${ssd} ГБ`);
  return parts.join(' / ');
}

/** Форматирование рублёвой цены с разделителем тысяч. */
export function formatRub(price: number): string {
  return `${price.toLocaleString('ru-RU')} ₽`;
}
