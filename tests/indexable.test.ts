// GST-79: страницы моделей без надёжных цен — noindex и вне sitemap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldIndexModel } from '../src/lib/sell-prices.ts';

const NOW = new Date('2026-09-26T12:00:00');
const STUDIO = { family: 'Mac Studio', chip: 'M1 Max' };
const row = (n: number, upd = '2026-09-20 10:00') => ({
  model_name: 'Mac Studio M1 Max', processor: 'Apple M1 Max', ram: 32, ssd: 512,
  buyout_price: 90000, median_price: 110000, min_price: 100000, max_price: 120000,
  samples_count: n, updated_at: upd,
});

test('есть надёжная конфигурация — страница в индексе', () => {
  assert.equal(shouldIndexModel([row(8)], STUDIO, NOW), true);
});

test('только ненадёжные строки — не индексируем', () => {
  assert.equal(shouldIndexModel([row(2)], STUDIO, NOW), false);
  assert.equal(shouldIndexModel([row(9, '2026-05-01 10:00')], STUDIO, NOW), false);
  assert.equal(shouldIndexModel([], STUDIO, NOW), false);
});

test('база не прочиталась — ничего не выкидываем из индекса', () => {
  assert.equal(shouldIndexModel(null, STUDIO, NOW), true);
  assert.equal(shouldIndexModel(undefined, STUDIO, NOW), true);
});

test('модель без сопоставления — в индексе как раньше', () => {
  assert.equal(shouldIndexModel([row(2)], undefined, NOW), true);
});
