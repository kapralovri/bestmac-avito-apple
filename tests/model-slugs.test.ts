// GST-78: каталог моделей /sell с полями сопоставления со строками базы цен.
// Запуск: npm test (Node 23 исполняет TypeScript сам).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_BUYOUT_MODELS, BUYOUT_MODELS, modelMatchFromSlug } from '../src/lib/model-slugs.ts';

test('у каждой из 31 модели заполнено сопоставление', () => {
  assert.equal(ALL_BUYOUT_MODELS.length, 31);
  for (const m of ALL_BUYOUT_MODELS) {
    assert.ok(m.match && m.match.family && m.match.chip, m.name);
  }
});

test('семейство сопоставления совпадает с группой каталога', () => {
  for (const [family, models] of Object.entries(BUYOUT_MODELS)) {
    for (const m of models) assert.equal(m.match.family, family, m.name);
  }
});

test('диагональ есть у ноутбуков и iMac, нет у Mac mini и Mac Studio', () => {
  for (const m of ALL_BUYOUT_MODELS) {
    const desktop = m.match.family === 'Mac mini' || m.match.family === 'Mac Studio';
    assert.equal(m.match.screen === undefined, desktop, m.name);
  }
});

test('чип сопоставления указан в названии модели', () => {
  for (const m of ALL_BUYOUT_MODELS) assert.ok(m.name.includes(m.match.chip), m.name);
});

test('сопоставление по slug', () => {
  assert.deepEqual(modelMatchFromSlug('macbook-pro-14-2023-m3-pro'),
    { family: 'MacBook Pro', screen: 14, chip: 'M3 Pro' });
  assert.deepEqual(modelMatchFromSlug('mac-mini-2024-m4'), { family: 'Mac mini', chip: 'M4' });
  assert.equal(modelMatchFromSlug('net-takoy-modeli'), undefined);
});
