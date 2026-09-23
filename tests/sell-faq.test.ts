// GST-78: FAQ страницы выкупа — вопросы из данных модели и тексты семейств.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSellModelPrices, buildModelFaq } from '../src/lib/sell-prices.ts';
import { FAMILY_FAQ } from '../src/data/family-faq.ts';
import { BUYOUT_MODELS } from '../src/lib/model-slugs.ts';

const NOW = new Date('2026-09-23T12:00:00');
const MINI_M4 = { family: 'Mac mini', chip: 'M4' };
const row = (ram: number, ssd: number, buyout: number, n: number) => ({
  model_name: 'Mac mini M4', processor: 'Apple M4', ram, ssd, buyout_price: buyout,
  median_price: buyout, min_price: buyout, max_price: buyout, samples_count: n,
  updated_at: '2026-09-20 10:00',
});

test('с данными: цена, влияние памяти и диска, частая конфигурация', () => {
  const p = buildSellModelPrices([row(16, 256, 50000, 21), row(16, 512, 70000, 6)], MINI_M4, NOW);
  const faq = buildModelFaq('Mac mini M4', p);
  assert.equal(faq.length, 3);
  assert.equal(faq[0].question, 'Сколько стоит выкуп Mac mini M4?');
  assert.equal(faq[0].answer,
    'До 70 000 ₽ за 16 ГБ / 512 ГБ. Цена по 27 объявлениям на Авито за последние 30 дней; точную сумму назовём после осмотра.');
  assert.equal(faq[1].question, 'Как память и диск влияют на цену Mac mini M4?');
  assert.equal(faq[1].answer, '16 ГБ / 256 ГБ — до 50 000 ₽, 16 ГБ / 512 ГБ — до 70 000 ₽.');
  assert.equal(faq[2].question, 'Какая конфигурация Mac mini M4 встречается чаще всего?');
  assert.equal(faq[2].answer,
    '16 ГБ / 256 ГБ — 21 объявление на Авито за последние 30 дней. Её выкупаем до 50 000 ₽.');
});

test('одна надёжная конфигурация — без вопроса о памяти и диске', () => {
  const p = buildSellModelPrices([row(16, 256, 50000, 21)], MINI_M4, NOW);
  const faq = buildModelFaq('Mac mini M4', p);
  assert.deepEqual(faq.map((f) => f.question), [
    'Сколько стоит выкуп Mac mini M4?',
    'Какая конфигурация Mac mini M4 встречается чаще всего?',
  ]);
  assert.ok(faq[0].answer.includes('по 21 объявлению'));
});

test('FAQ без данных — ответ про оценку по фото, без цифр', () => {
  const p = buildSellModelPrices([], MINI_M4, NOW);
  assert.deepEqual(buildModelFaq('Mac mini M4', p), [{
    question: 'Сколько стоит выкуп Mac mini M4?',
    answer: 'Свежих объявлений по этой модели мало, поэтому цену назовём по фото за 15 минут.',
  }]);
});

test('тексты есть у каждого семейства каталога, по три вопроса', () => {
  for (const family of Object.keys(BUYOUT_MODELS)) {
    assert.equal(FAMILY_FAQ[family]?.length, 3, family);
    for (const f of FAMILY_FAQ[family]) assert.ok(f.question.endsWith('?') && f.answer.length > 20, f.question);
  }
});

test('FAQ: ручная цена без выдуманных объявлений', () => {
  const manual = { ...row(16, 256, 40000, 34), updated_at: '2026-07-17 10:00', manual_override: true };
  const onlyManual = buildModelFaq('Mac mini M4', buildSellModelPrices([manual], MINI_M4, NOW));
  assert.deepEqual(onlyManual.map((f) => f.question), ['Сколько стоит выкуп Mac mini M4?']);
  assert.equal(onlyManual[0].answer, 'До 40 000 ₽ за 16 ГБ / 256 ГБ. Точную сумму назовём после осмотра.');

  const mixed = buildModelFaq('Mac mini M4', buildSellModelPrices([manual, row(16, 512, 70000, 6)], MINI_M4, NOW));
  assert.ok(mixed[0].answer.includes('по 6 объявлениям'));
  assert.ok(mixed.at(-1)!.answer.startsWith('16 ГБ / 512 ГБ — 6 объявлений'));
});
