// GST-81: трейд-ин — тексты и настройка доплаты.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tradeInBonusText, tradeInFaq, TRADE_IN_STEPS, TRADE_IN_OPTIONS, TRADE_IN_COMPARISON,
} from '../src/data/trade-in.ts';

test('процент не задан — текст без цифры и без «null»', () => {
  const t = tradeInBonusText(null);
  assert.ok(t.includes('процент'), t);
  assert.ok(!/\d|%|null/.test(t), t);
  assert.equal(tradeInBonusText(0), t);
});

test('процент задан', () => {
  assert.equal(tradeInBonusText(5), 'доплатим +5% к цене выкупа вашего Mac');
});

test('FAQ: от 5 вопросов, доплата — тем же текстом, что в настройке', () => {
  for (const percent of [null, 7]) {
    const faq = tradeInFaq(percent);
    assert.ok(faq.length >= 5);
    for (const f of faq) {
      assert.ok(f.question.endsWith('?'), f.question);
      assert.ok(f.answer.length > 30, f.answer);
    }
    assert.ok(faq.some((f) => f.answer.includes(tradeInBonusText(percent))));
  }
});

test('шаги, варианты и сравнение заполнены', () => {
  assert.equal(TRADE_IN_STEPS.length, 3);
  assert.deepEqual(TRADE_IN_OPTIONS.map((o) => o.href), ['/buy', 'https://t.me/romanmanro']);
  for (const r of TRADE_IN_COMPARISON.rows) {
    assert.equal(r.cells.length, TRADE_IN_COMPARISON.columns.length, r.label);
  }
});
