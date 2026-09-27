// /business: тексты страницы — только подтверждённые условия (docs/business-bu-mac.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../src/data/business.ts';
import { ALL_BUYOUT_MODELS } from '../src/lib/model-slugs.ts';

const ALL_TEXT = JSON.stringify(B);
const FORBIDDEN = ['лизинг', 'рассрочк', 'счёт-фактур', 'счет-фактур', 'персональный менеджер',
  'ipad', 'до 3 месяцев', '40%', 'техподдержк'];

test('нет обещаний, которых владелец не подтвердил', () => {
  const low = ALL_TEXT.toLowerCase();
  for (const w of FORBIDDEN) assert.ok(!low.includes(w), w);
});

test('условия владельца названы', () => {
  for (const w of ['без НДС', 'ТОРГ-12', 'акт', 'договор', 'счёт', 'расчётный счёт']) assert.ok(ALL_TEXT.includes(w), w);
});

test('FAQ: 6 вопросов, свои формулировки', () => {
  assert.equal(B.BUSINESS_FAQ.length, 6);
  for (const f of B.BUSINESS_FAQ) {
    assert.ok(f.question.endsWith('?'), f.question);
    assert.ok(f.answer.length > 30, f.answer);
    if (f.href) assert.ok(f.linkText, f.question);
  }
  assert.ok(B.BUSINESS_FAQ.some((f) => f.href === '/vykup/dlya-yurlits'));
});

test('шаги, условия и доводы заполнены', () => {
  assert.equal(B.BUSINESS_STEPS.length, 5);
  assert.equal(B.BUSINESS_TERMS.length, 4);
  assert.ok(B.BUSINESS_REASONS.length >= 4);
});

test('офисные модели есть в каталоге выкупа', () => {
  assert.equal(B.OFFICE_MODEL_SLUGS.length, 10);
  const known = new Set(ALL_BUYOUT_MODELS.map((m) => m.slug));
  for (const s of B.OFFICE_MODEL_SLUGS) assert.ok(known.has(s), s);
});
