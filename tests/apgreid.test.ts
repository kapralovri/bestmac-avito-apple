// Статья «Апгрейд макбука»: Google ~1 000 показов за 3 месяца на 2-й странице.
// Факты — проверяемые, без выдуманных цен сервисов; ведём в трейд-ин.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apgreidFaq, APGREID_FACTS } from '../src/data/apgreid.ts';
import { tradeInBonusText, TRADE_IN_BONUS_PERCENT } from '../src/data/trade-in.ts';

const BONUS = tradeInBonusText(TRADE_IN_BONUS_PERCENT);
const APGREID_FAQ = apgreidFaq(BONUS);

const ALL = JSON.stringify({ APGREID_FAQ, APGREID_FACTS });

test('FAQ под запросы: память, SSD, iMac, апгрейд или трейд-ин', () => {
  assert.ok(APGREID_FAQ.length >= 5);
  for (const f of APGREID_FAQ) {
    assert.ok(f.question.endsWith('?'), f.question);
    assert.ok(f.answer.length > 40, f.answer);
  }
  const q = APGREID_FAQ.map((f) => f.question.toLowerCase()).join(' ');
  for (const w of ['память', 'ssd', 'imac', 'трейд-ин']) assert.ok(q.includes(w), w);
});

test('нет выдуманных цен сторонних сервисов и «официального сервиса Apple»', () => {
  assert.ok(!/\d[\d\s,]*\s?₽/.test(ALL), 'цены в рублях только из базы, не в тексте');
  assert.ok(!/официальн\w* (apple )?(service|сервис)/i.test(ALL));
});

test('SSD в MacBook на M-чипах распаян на плате, а не «в чипе»', () => {
  assert.ok(!/ssd[^.]*в (единый )?чип/i.test(ALL));
  assert.ok(/ssd[^.]*распа/i.test(ALL));
});

test('трейд-ин — тем же текстом, что на странице трейд-ина', () => {
  assert.ok(APGREID_FAQ.some((f) => f.answer.includes(BONUS)));
});
