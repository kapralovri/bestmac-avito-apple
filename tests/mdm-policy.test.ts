// Политика владельца (26.09.2026): Mac с корпоративным профилем MDM не выкупаем;
// доплата при трейд-ине — 10% к цене выкупа.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BROKEN_SECTIONS, BROKEN_FAQ } from '../src/data/broken-hub.ts';
import { VYKUP_LANDINGS } from '../src/data/vykup-landings.ts';
import { TRADE_IN_BONUS_PERCENT, tradeInBonusText } from '../src/data/trade-in.ts';

test('лендинг заблокированных не обещает выкуп MDM', () => {
  const l = VYKUP_LANDINGS.find((x) => x.slug === 'zablokirovannogo-macbook')!;
  for (const t of [l.h1, l.title, l.description, l.intro, ...l.features.map((f) => f.title)]) {
    assert.ok(!t.includes('MDM'), t);
  }
  const faq = l.faq.find((f) => f.q.includes('MDM'))!;
  assert.match(faq.a, /^Нет/);
});

test('хаб сломанных: MDM не выкупаем', () => {
  const s = BROKEN_SECTIONS.find((x) => x.id === 'blokirovka')!;
  assert.match(s.text, /MDM[^.]*не выкупаем/);
  const f = BROKEN_FAQ.find((x) => x.question.includes('заблокированные'))!;
  assert.match(f.answer, /MDM[^.]*не выкупаем/);
});

test('списки «что выкупаем» без MDM', () => {
  for (const p of ['src/views/Sell.tsx', 'src/views/sell/SellSeries.tsx']) {
    assert.ok(!/заблокированные \(MDM/i.test(readFileSync(p, 'utf-8')), p);
  }
});

test('доплата при трейд-ине — 10%', () => {
  assert.equal(TRADE_IN_BONUS_PERCENT, 10);
  assert.equal(tradeInBonusText(TRADE_IN_BONUS_PERCENT), 'доплатим +10% к цене выкупа вашего Mac');
});
