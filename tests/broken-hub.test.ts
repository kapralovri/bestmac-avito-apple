// GST-81: хаб «сломанный макбук» — разделы, ссылки, FAQ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BROKEN_SECTIONS, BROKEN_PRICING, BROKEN_FAQ } from '../src/data/broken-hub.ts';
import { VYKUP_LANDINGS } from '../src/data/vykup-landings.ts';

test('пять поломок в порядке спеки', () => {
  assert.deepEqual(BROKEN_SECTIONS.map((s) => s.id),
    ['ekran', 'ne-vklyuchaetsya', 'zalit', 'blokirovka', 'zapchasti']);
});

test('хаб ведёт только на существующие лендинги /vykup', () => {
  const existing = new Set(VYKUP_LANDINGS.map((l) => `/vykup/${l.slug}`));
  const links = BROKEN_SECTIONS.filter((s) => s.link).map((s) => s.link!.href);
  assert.deepEqual(links, ['/vykup/zalitogo-macbook', '/vykup/zablokirovannogo-macbook', '/vykup/na-zapchasti']);
  for (const href of links) assert.ok(existing.has(href), href);
});

test('FAQ: от 5 вопросов', () => {
  assert.ok(BROKEN_FAQ.length >= 5);
  for (const f of BROKEN_FAQ) {
    assert.ok(f.question.endsWith('?'), f.question);
    assert.ok(f.answer.length > 30, f.answer);
  }
});

test('без выдуманных сумм ремонта', () => {
  const all = [...BROKEN_SECTIONS.map((s) => s.text), BROKEN_PRICING, ...BROKEN_FAQ.map((f) => f.answer)].join(' ');
  assert.ok(!/\d[\d\s]*₽|руб/.test(all));
});
