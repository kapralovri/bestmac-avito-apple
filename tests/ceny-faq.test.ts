// GST-81: FAQ страницы цен — под запросы «сколько стоит б/у макбук».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CENY_FAQ } from '../src/data/ceny-faq.ts';

test('FAQ цен: вопросы из ядра запросов', () => {
  assert.ok(CENY_FAQ.length >= 4);
  assert.ok(CENY_FAQ.some((f) => f.question.startsWith('За сколько можно продать макбук')));
  for (const f of CENY_FAQ) {
    assert.ok(f.question.endsWith('?'), f.question);
    assert.ok(f.answer.length > 30, f.answer);
  }
});

test('медиана — цена объявлений, а не итог сделки', () => {
  const f = CENY_FAQ.find((x) => x.question.startsWith('За сколько можно продать макбук'))!;
  assert.match(f.answer, /выставляют/);
});
