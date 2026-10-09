// Главная: блок «Скупка макбуков в Москве» — Яндекс держит «скупка макбуков»
// на 9–10 месте, а на странице это слово встречалось трижды.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_SKUPKA } from '../src/data/home-skupka.ts';

const ALL = JSON.stringify(HOME_SKUPKA);

test('только проверяемые обещания владельца', () => {
  for (const w of ['15 минут', 'киевская', 'выезд', 'наличными', 'договор']) assert.ok(ALL.toLowerCase().includes(w), w);
  assert.ok(!/iphone|ipad/i.test(ALL), 'выкупаем только Mac');
});

test('MDM не выкупаем, iCloud — только с подтверждением владения', () => {
  assert.match(ALL, /MDM/);
  assert.match(ALL, /iCloud[^"]*подтвер/);
});

test('ссылки ведут на существующие разделы', () => {
  const hrefs = HOME_SKUPKA.links.map((l) => l.href);
  for (const h of ['/sell', '/sell/broken', '/trade-in', '/ceny']) assert.ok(hrefs.includes(h), h);
});

test('слово «скупка» в заголовке и тексте', () => {
  assert.match(HOME_SKUPKA.title, /Скупка макбуков/);
  assert.ok((ALL.match(/скупк/gi) || []).length >= 3);
});
