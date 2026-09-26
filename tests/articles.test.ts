// Статьи пачки 3: структура, FAQ и только живые внутренние ссылки.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARTICLES, articleLinks } from '../src/data/articles.ts';
import { ALL_BUYOUT_MODELS } from '../src/lib/model-slugs.ts';
import { VYKUP_LANDINGS } from '../src/data/vykup-landings.ts';

const ROUTES = new Set<string>([
  '/sell', '/trade-in', '/ceny', '/sell/broken', '/buy',
  '/blog/kak-prodat-macbook-vygodno', '/blog/proverka-macbook-pered-pokupkoi',
  ...ALL_BUYOUT_MODELS.map((m) => `/sell/${m.slug}`),
  ...VYKUP_LANDINGS.map((l) => `/vykup/${l.slug}`),
  ...ARTICLES.map((a) => `/blog/${a.slug}`),
]);

test('три статьи с уникальными адресами', () => {
  assert.deepEqual(ARTICLES.map((a) => a.slug), [
    'kak-sbrosit-macbook-do-zavodskih-nastroek', 'kak-uznat-model-macbook', 'sostoyanie-akkumulyatora-macbook',
  ]);
});

test('у каждой статьи заголовки, разделы и FAQ', () => {
  for (const a of ARTICLES) {
    assert.ok(a.title.length > 20 && a.h1.length > 20 && a.description.length > 80, a.slug);
    assert.ok(a.sections.length >= 4, a.slug);
    assert.ok(a.faq.length >= 3, a.slug);
    for (const f of a.faq) assert.ok(f.question.endsWith('?') && f.answer.length > 30, f.question);
  }
});

test('внутренние ссылки ведут только на существующие страницы', () => {
  for (const a of ARTICLES) {
    const links = articleLinks(a);
    assert.ok(links.length >= 2, `${a.slug}: мало ссылок`);
    for (const href of links) if (href.startsWith('/')) assert.ok(ROUTES.has(href), `${a.slug}: ${href}`);
  }
});

test('ссылки из текста вида [текст](/путь) извлекаются', () => {
  const links = articleLinks({ ...ARTICLES[0], lead: 'см. [калькулятор](/sell) и [трейд-ин](/trade-in)', sections: [], faq: [], cta: { title: 'x', text: '' } });
  assert.deepEqual(links, ['/sell', '/trade-in']);
});
