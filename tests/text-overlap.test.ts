// GST-81: похожесть страниц по 5-словным фрагментам.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shingles, overlapShare, ownPageText } from '../src/lib/text-overlap.ts';

test('фрагменты по 5 слов, регистр и ё не важны', () => {
  assert.deepEqual([...shingles('Продать Макбук в Москве дорого сегодня')],
    ['продать макбук в москве дорого', 'макбук в москве дорого сегодня']);
  assert.equal(overlapShare('Ещё один тест текста здесь', 'еще один тест текста здесь'), 1);
});

test('доля общих фрагментов', () => {
  const a = 'один два три четыре пять шесть семь восемь';
  assert.equal(overlapShare(a, a), 1);
  assert.equal(overlapShare(a, 'совсем другой текст про трейд ин макбука'), 0);
  assert.equal(overlapShare(a, 'один два три четыре пять шесть'), 0.5);
  assert.equal(overlapShare('коротко', 'коротко'), 0);
});

test('свой текст страницы — без шапки, подвала, скриптов и общих блоков', () => {
  const html = '<header>Меню сайта</header><main><h1>Трейд-ин макбука</h1>'
    + '<script>var x="секрет"</script>'
    + '<section class="py-12" data-shared-block="reviews"><p>Отзыв общий</p></section>'
    + '<p>Свой&nbsp;текст</p></main><footer>Подвал</footer>';
  assert.equal(ownPageText(html), 'Трейд-ин макбука Свой текст');
});
