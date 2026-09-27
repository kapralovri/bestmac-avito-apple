// /business: типичная конфигурация офисных моделей (docs/business-bu-mac.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { officePriceRows } from '../src/lib/sell-prices.ts';

const NOW = new Date('2026-09-27T12:00:00');
const row = (name: string, processor: string, ram: number, ssd: number, median: number,
             n: number, upd = '2026-09-25 10:00', extra: Record<string, unknown> = {}) => ({
  model_name: name, processor, ram, ssd, buyout_price: Math.round(median * 0.8),
  median_price: median, min_price: median, max_price: median,
  samples_count: n, updated_at: upd, ...extra,
});
const CATALOG = [
  { name: 'MacBook Air 13 (2020, M1)', slug: 'air-m1', match: { family: 'MacBook Air', screen: 13, chip: 'M1' } },
  { name: 'MacBook Air 13 (2022, M2)', slug: 'air-m2', match: { family: 'MacBook Air', screen: 13, chip: 'M2' } },
  { name: 'MacBook Pro 14 (2021, M1 Pro)', slug: 'pro-m1pro', match: { family: 'MacBook Pro', screen: 14, chip: 'M1 Pro' } },
];

test('типичная — надёжная рыночная конфигурация с наибольшим числом объявлений; цена — медиана', () => {
  const stats = [
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 256, 62990, 23),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 16, 512, 80000, 7),
  ];
  const { rows } = officePriceRows(stats, CATALOG, ['air-m2'], NOW);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, 'air-m2');
  assert.equal(rows[0].name, 'MacBook Air 13 (2022, M2)');
  assert.equal(rows[0].config.ram, 8);
  assert.equal(rows[0].config.medianPrice, 62990);
  assert.deepEqual(rows[0].sourceModelNames, ['MacBook Air 13 (2022, M2)']);
});

test('ничья по числу объявлений — младшая конфигурация', () => {
  const stats = [
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 16, 256, 76990, 9),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 512, 64999, 9),
  ];
  const { rows } = officePriceRows(stats, CATALOG, ['air-m2'], NOW);
  assert.equal(rows[0].config.ram, 8);
  assert.equal(rows[0].config.ssd, 512);
});

test('модель без надёжных рыночных конфигураций пропускается (старые, мало объявлений, только ручная)', () => {
  const stats = [
    row('MacBook Air 13 (2020, M1)', 'Apple M1', 8, 256, 45000, 13, '2026-07-01 10:00'),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 256, 62990, 3),
    row('MacBook Pro 14 (2021)', 'Apple M1 Pro', 16, 512, 85000, 2, '2026-09-25 10:00', { manual_override: true }),
  ];
  assert.deepEqual(officePriceRows(stats, CATALOG, ['air-m1', 'air-m2', 'pro-m1pro'], NOW).rows, []);
});

test('порядок — как в списке slug-ов; неизвестный slug пропускается', () => {
  const stats = [
    row('MacBook Air 13 (2020, M1)', 'Apple M1', 8, 256, 45000, 13),
    row('MacBook Pro 14 (2021)', 'Apple M1 Pro', 16, 512, 85000, 46),
  ];
  const { rows } = officePriceRows(stats, CATALOG, ['pro-m1pro', 'nope', 'air-m1'], NOW);
  assert.deepEqual(rows.map((r) => r.slug), ['pro-m1pro', 'air-m1']);
});

test('latestUpdate — самая свежая дата среди строк; пустая база — пусто', () => {
  const stats = [
    row('MacBook Air 13 (2020, M1)', 'Apple M1', 8, 256, 45000, 13, '2026-09-20 10:00'),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 256, 62990, 23, '2026-09-26 09:00'),
  ];
  assert.equal(officePriceRows(stats, CATALOG, ['air-m1', 'air-m2'], NOW).latestUpdate, '2026-09-26 09:00');
  assert.deepEqual(officePriceRows(null, CATALOG, ['air-m1'], NOW), { rows: [], latestUpdate: null });
});
