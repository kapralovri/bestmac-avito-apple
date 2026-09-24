// Сводка «до X ₽» по моделям каталога — для серверного блока на /vykup и /sell.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelPriceSummaries } from '../src/lib/sell-prices.ts';

const NOW = new Date('2026-09-23T12:00:00');
const row = (name: string, processor: string, ram: number, ssd: number, buyout: number, n: number) => ({
  model_name: name, processor, ram, ssd, buyout_price: buyout, median_price: buyout,
  min_price: buyout, max_price: buyout, samples_count: n, updated_at: '2026-09-20 10:00',
});
const CATALOG = [
  { name: 'MacBook Air 13 (2022, M2)', slug: 'macbook-air-13-2022-m2', match: { family: 'MacBook Air', screen: 13, chip: 'M2' } },
  { name: 'Mac mini (2024, M4)', slug: 'mac-mini-2024-m4', match: { family: 'Mac mini', chip: 'M4' } },
  { name: 'Mac Studio (2022, M1 Max)', slug: 'mac-studio-2022-m1-max', match: { family: 'Mac Studio', chip: 'M1 Max' } },
];

test('по модели: максимум надёжных, число конфигураций; без надёжных — не показываем', () => {
  const stats = [
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 256, 38000, 9),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 16, 512, 52000, 7),
    row('Mac mini M4', 'Apple M4', 16, 256, 40000, 30),
    row('Mac Studio M1 Max', 'Apple M1 Max', 32, 512, 90000, 2),
  ];
  assert.deepEqual(modelPriceSummaries(stats, CATALOG, NOW), [
    { name: 'MacBook Air 13 (2022, M2)', slug: 'macbook-air-13-2022-m2', family: 'MacBook Air', maxBuyout: 52000, configs: 2 },
    { name: 'Mac mini (2024, M4)', slug: 'mac-mini-2024-m4', family: 'Mac mini', maxBuyout: 40000, configs: 1 },
  ]);
});

test('пустая база — пустая сводка', () => {
  assert.deepEqual(modelPriceSummaries(null, CATALOG, NOW), []);
});
