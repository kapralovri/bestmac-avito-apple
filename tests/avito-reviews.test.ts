// Отзывы с Авито на сайте — реальные, с источником, без выдуманных текстов.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVITO_RATING, AVITO_REVIEWS } from '../src/data/avito-reviews.ts';

test('рейтинг и ссылка на профиль', () => {
  assert.equal(AVITO_RATING.value, '5,0');
  assert.equal(AVITO_RATING.count, 254);
  assert.ok(AVITO_RATING.profileUrl.startsWith('https://www.avito.ru/user/review?fid='));
});

test('отзывы: имя без фамилии, дата, устройство, текст', () => {
  assert.ok(AVITO_REVIEWS.length >= 8);
  for (const r of AVITO_REVIEWS) {
    assert.ok(r.name && !r.name.includes(' '), r.name);
    assert.match(r.date, /^\d{1,2} [а-я]+ 20\d{2}$/);
    assert.ok(r.device.length > 5 && r.text.length > 5, r.text);
  }
});
