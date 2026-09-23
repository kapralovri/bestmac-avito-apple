// GST-78: цены страницы выкупа модели — сопоставление, надёжность, форматы.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchRows, buildSellModelPrices, ageDays, formatRub, configLabel,
  ramOptions, ssdOptions, findConfig,
} from '../src/lib/sell-prices.ts';

const NOW = new Date('2026-09-23T12:00:00');
const row = (name: string, processor: string, ram: number, ssd: number, buyout: number,
             n: number, upd = '2026-09-20 10:00', extra: Record<string, unknown> = {}) => ({
  model_name: name, processor, ram, ssd, buyout_price: buyout,
  median_price: Math.round(buyout / 0.8), min_price: buyout, max_price: buyout,
  samples_count: n, updated_at: upd, ...extra,
});
const PRO14 = { family: 'MacBook Pro', screen: 14, chip: 'M3 Pro' };
const AIR13_M1 = { family: 'MacBook Air', screen: 13, chip: 'M1' };
const MINI_M4 = { family: 'Mac mini', chip: 'M4' };

test('сопоставление: семейство, диагональ и чип; сводки не берутся', () => {
  const stats = [
    row('MacBook Pro 14 (2023)', 'Apple M3 Pro', 18, 512, 120000, 9),
    row('MacBook Pro 14 (2023)', 'Apple M2 Pro', 16, 512, 90000, 9),
    row('MacBook Pro 16 (2023)', 'Apple M3 Pro', 18, 512, 140000, 9),
    row('MacBook Pro 14 (2023)', '', 0, 0, 100000, 141),
  ];
  const got = matchRows(stats, PRO14);
  assert.equal(got.length, 1);
  assert.equal(got[0].processor, 'Apple M3 Pro');
  assert.equal(got[0].model_name, 'MacBook Pro 14 (2023)');
});

test('Air без диагонали не попадает на страницу 13"', () => {
  const stats = [
    row('MacBook Air 13 (2020, M1)', 'Apple M1', 8, 256, 40000, 13),
    row('MacBook Air M1', 'Apple M1', 8, 512, 45000, 16),
  ];
  assert.deepEqual(matchRows(stats, AIR13_M1).map((s) => s.ssd), [256]);
});

test('Mac mini: без диагонали, регистр названия не важен, M4 Pro не смешивается с M4', () => {
  const stats = [
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 34),
    row('mac mini m4', 'Apple M4', 16, 512, 70000, 8),
    row('Mac mini M4 Pro', 'Apple M4 Pro', 24, 512, 120000, 9),
    row('MacBook Air 13 M4', 'Apple M4', 16, 256, 60000, 9),
  ];
  assert.deepEqual(matchRows(stats, MINI_M4).map((s) => s.ssd), [256, 512]);
});

test('Intel: процессор без «Apple»', () => {
  const stats = [row('iMac 27 (2019, Intel)', 'Intel', 8, 1024, 30000, 6)];
  assert.equal(matchRows(stats, { family: 'iMac', screen: 27, chip: 'Intel' }).length, 1);
});

test('надёжность: от 5 объявлений и не старше 30 дней', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 5),
    row('Mac mini M4', 'Apple M4', 16, 512, 70000, 4),
    row('Mac mini M4', 'Apple M4', 24, 512, 90000, 9, '2026-08-01 10:00'),
  ], MINI_M4, NOW);
  assert.deepEqual(p.configs.map((c) => c.reliable), [true, false, false]);
  assert.deepEqual(p.reliable.map((c) => c.ssd), [256]);
});

test('ручная цена надёжна при любой выборке и возрасте', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 1, '2026-01-01 10:00', { manual_override: true }),
  ], MINI_M4, NOW);
  assert.equal(p.reliable.length, 1);
  assert.equal(p.reliable[0].manual, true);
});

test('порядок цен: снимается строка пары с меньшей выборкой', () => {
  const smallerThin = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 60000, 6),
    row('Mac mini M4', 'Apple M4', 16, 512, 55000, 20),
  ], MINI_M4, NOW);
  assert.deepEqual(smallerThin.reliable.map((c) => c.ssd), [512]);

  const biggerThin = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 60000, 20),
    row('Mac mini M4', 'Apple M4', 16, 512, 55000, 6),
  ], MINI_M4, NOW);
  assert.deepEqual(biggerThin.reliable.map((c) => c.ssd), [256]);
});

test('порядок цен: ручная цена не снимается, снимается соседняя', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 60000, 1, '2026-01-01 10:00', { manual_override: true }),
    row('Mac mini M4', 'Apple M4', 16, 512, 55000, 40),
  ], MINI_M4, NOW);
  assert.deepEqual(p.reliable.map((c) => c.ssd), [256]);
});

test('дубль конфигурации — остаётся строка с большей выборкой', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 7),
    row('mac mini m4', 'Apple M4', 16, 256, 44000, 30),
  ], MINI_M4, NOW);
  assert.equal(p.configs.length, 1);
  assert.equal(p.configs[0].buyoutPrice, 44000);
});

test('«до X ₽», выборка и дата — по надёжным', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 10, '2026-09-10 10:00'),
    row('Mac mini M4', 'Apple M4', 16, 512, 70000, 6, '2026-09-21 09:00'),
    row('Mac mini M4', 'Apple M4', 32, 1024, 150000, 2),
  ], MINI_M4, NOW);
  assert.equal(p.maxBuyout, 70000);
  assert.equal(p.reliableSamples, 16);
  assert.equal(p.latestUpdate, '2026-09-21 09:00');
  assert.deepEqual(p.sourceModelNames, ['Mac mini M4']);
});

test('нет данных — пустой результат без падения', () => {
  for (const p of [
    buildSellModelPrices([], MINI_M4, NOW),
    buildSellModelPrices(null, MINI_M4, NOW),
    buildSellModelPrices([row('Mac mini M4', 'Apple M4', 16, 256, 50000, 9)], undefined, NOW),
  ]) {
    assert.deepEqual(p.configs, []);
    assert.equal(p.maxBuyout, 0);
    assert.equal(p.latestUpdate, null);
  }
});

test('возраст: формат базы и старый формат парсера', () => {
  assert.equal(ageDays('2026-09-20 10:00', NOW), 3);
  assert.equal(ageDays('Thu Apr 23 16:02:18 2026', NOW), 152);
  assert.equal(ageDays('вчера', NOW), null);
  assert.equal(ageDays('', NOW), null);
});

test('форматы цены и конфигурации', () => {
  assert.equal(formatRub(52000), '52 000 ₽');
  assert.equal(formatRub(1250000), '1 250 000 ₽');
  assert.equal(configLabel({ ram: 16, ssd: 512 }), '16 ГБ / 512 ГБ');
  assert.equal(configLabel({ ram: 64, ssd: 2048 }), '64 ГБ / 2 ТБ');
});

test('калькулятор: опции памяти и диска, поиск конфигурации', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 9),
    row('Mac mini M4', 'Apple M4', 16, 512, 70000, 9),
    row('Mac mini M4', 'Apple M4', 24, 512, 90000, 2),
  ], MINI_M4, NOW);
  assert.deepEqual(ramOptions(p.configs), [16, 24]);
  assert.deepEqual(ssdOptions(p.configs, 16), [256, 512]);
  assert.equal(findConfig(p.configs, 24, 512)?.reliable, false);
  assert.equal(findConfig(p.configs, 8, 256), undefined);
});
