# GST-81 · Пачка 2: трейд-ин, сломанные, «сколько стоит б/у» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** новая страница `/trade-in`, серверный хаб `/sell/broken` и `/ceny` под «сколько стоит б/у макбук» — с текстом в HTML, уникальным относительно остальных страниц сайта.

**Architecture:** тексты страниц живут в чистых модулях данных `src/data/*.ts` (без рантайм-импортов, тестируются `node --test`), страницы — серверные компоненты Next.js, которые рисуют эти данные и переиспользуют готовые блоки (`PopularBuyoutPrices`, `AvitoReviews`, `LeadForm`, `PhotoEstimate`). Уникальность проверяется инструментом по 5-словным фрагментам на собранном сайте.

**Tech Stack:** Next.js 16 (App Router, SSG), TypeScript, тесты — `node --test` (Node 23).

**Spec:** [`docs/seo-batch2-GST-81.md`](seo-batch2-GST-81.md)

## Global Constraints

- Выкупаем **только Mac** (MacBook, iMac, Mac mini, Mac Studio).
- Трейд-ин: в зачёт б/у Mac из наличия и нового под заказ; при зачёте **доплачиваем процент к цене выкупа**. Процент задаёт владелец в `TRADE_IN_BONUS_PERCENT`; пока `null` — на страницах без цифры.
- Только проверяемые обещания: оценка по фото за 15 минут, офис у м. Киевская, выезд по Москве бесплатно, оплата наличными или переводом, договор, гарантия 1 месяц на б/у. Никаких цифр ₽, которых нет в базе цен.
- Слова ядра — естественно: «макбук» и «MacBook» вместе, «сдать», «продать», «трейд-ин».
- Текст страниц — в **серверном HTML**.
- Собственный текст каждой из трёх страниц — **не больше 40%** общих 5-словных фрагментов с любой другой страницей сайта (без шапки, подвала и общих блоков).
- `/sell/broken`: title и H1 не меняются («Продать сломанный макбук — скупка неисправных MacBook в Москве», «Сломался MacBook? Мы купим его сегодня.»).
- Модули в `src/data/*.ts` и `src/lib/text-overlap.ts` — без рантайм-импортов (только `import type`), иначе их не запустить `node --test`.
- Тесты в `tests/`, импорт модулей с расширением `.ts`.
- Сборку проверять только в чистой копии (на Рабочем столе `node_modules` испорчены копиями iCloud).
- Коммиты — только явно перечисленные пути; сообщение заканчивается строкой `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Комментарии в коде — по-русски, с меткой `GST-81`.

## Review Focus

1. **Процент доплаты не задан (`null`) или 0.** Ожидание: нигде нет «null%», «+%» или пустой цифры — текст «доплатим процент … назовём при оценке». Тест — Task 2.
2. **База цен пуста или не прочиталась.** Ожидание: трейд-ин и хаб строятся без блока цен, а не с пустым заголовком. Покрыто: `PopularBuyoutPrices` возвращает `null` при пустой сводке (тест «пустая база — пустая сводка» в `tests/price-summaries.test.ts`); проверка сборкой — Task 5.
3. **Ссылки хаба на узкие страницы `/vykup/*`.** Ожидание: ведут только на существующие лендинги. Тест — Task 3.
4. **Разметка FAQPage расходится с видимым FAQ.** Ожидание: одна и та же выборка вопросов в HTML и JSON-LD — строятся из одного массива; тесты на заполненность — Tasks 2–4.
5. **Новая страница повторяет соседние.** Ожидание: ≤ 40% общих фрагментов собственного текста. Проверка инструментом — Task 5.

---

### Task 1: Инструмент уникальности текста

**Files:**
- Create: `src/lib/text-overlap.ts`
- Create: `tests/tools/check-uniqueness.mts` (не тест `npm test`, запускается вручную в Task 5)
- Test: `tests/text-overlap.test.ts`

**Interfaces:**
- Produces: `shingles(text: string, n?: number): Set<string>`; `overlapShare(a: string, b: string, n?: number): number` (доля фрагментов `a`, встречающихся в `b`, 0…1); `ownPageText(html: string): string` (видимый текст без шапки, подвала, `<script>`, `<style>` и секций с атрибутом `data-shared-block`).

- [ ] **Step 1: Падающий тест** — `tests/text-overlap.test.ts`:

```ts
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
```

- [ ] **Step 2: Убедиться, что падает.** Run: `npm test` · Expected: `Cannot find module '…/src/lib/text-overlap.ts'`.

- [ ] **Step 3: Реализация** — `src/lib/text-overlap.ts`:

```ts
/**
 * Похожесть текстов страниц по 5-словным фрагментам (GST-81). Яндекс исключал
 * наши страницы как малоценные, когда они повторяли друг друга, — перед
 * выкаткой новых страниц проверяем, что их собственный текст не дублирует
 * соседние. Чистые функции без импортов: тесты запускает `node --test`.
 */
export function shingles(text: string, n = 5): Set<string> {
  const words = text.toLowerCase().replace(/ё/g, 'е').match(/[a-zа-я0-9]+/g) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}

/** Доля фрагментов текста a, которые встречаются в тексте b (0…1). */
export function overlapShare(a: string, b: string, n = 5): number {
  const own = shingles(a, n);
  if (!own.size) return 0;
  const other = shingles(b, n);
  let common = 0;
  for (const s of own) if (other.has(s)) common++;
  return common / own.size;
}

/**
 * Видимый текст основной части страницы: без шапки, подвала, скриптов и общих
 * блоков (отзывы, цены), помеченных атрибутом data-shared-block.
 */
export function ownPageText(html: string): string {
  let body = html;
  const headerEnd = body.indexOf('</header>');
  if (headerEnd >= 0) body = body.slice(headerEnd + '</header>'.length);
  const footerStart = body.lastIndexOf('<footer');
  if (footerStart >= 0) body = body.slice(0, footerStart);
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<section[^>]*data-shared-block[^>]*>[\s\S]*?<\/section>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
```

- [ ] **Step 4: Инструмент для Task 5** — `tests/tools/check-uniqueness.mts`:

```ts
// GST-81: уникальность новых страниц на собранном сайте.
// Запуск: node tests/tools/check-uniqueness.mts http://localhost:3930
import { overlapShare, ownPageText } from '../../src/lib/text-overlap.ts';

const base = process.argv[2] ?? 'http://localhost:3930';
const TARGETS = ['/trade-in', '/sell/broken', '/ceny'];
const OTHERS = [
  '/', '/sell', '/buy', '/sell/macbook-air', '/sell/macbook-pro', '/sell/mac-mini-2024-m4',
  '/vykup/srochno', '/vykup/na-domu-moskva', '/vykup/ocenka-onlajn', '/vykup/zalitogo-macbook',
  '/vykup/zablokirovannogo-macbook', '/vykup/na-zapchasti', '/ceny/macbook-air-13-2022-m2',
];
const LIMIT = 0.4;

const pages = new Map<string, string>();
for (const p of [...TARGETS, ...OTHERS]) {
  pages.set(p, ownPageText(await (await fetch(base + p)).text()));
}

let failed = false;
for (const t of TARGETS) {
  const own = pages.get(t)!;
  const worst = [...pages.entries()]
    .filter(([p]) => p !== t)
    .map(([p, other]) => [p, overlapShare(own, other)] as const)
    .sort((a, b) => b[1] - a[1])[0];
  const ok = worst[1] <= LIMIT;
  failed ||= !ok;
  console.log(`${ok ? '✅' : '❌'} ${t}: ${own.split(' ').length} слов своего текста; больше всего общего с ${worst[0]} — ${Math.round(worst[1] * 100)}%`);
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 5: Тесты проходят.** Run: `npm test` · Expected: `ℹ fail 0`.

- [ ] **Step 6: Коммит**

```bash
git add src/lib/text-overlap.ts tests/text-overlap.test.ts tests/tools/check-uniqueness.mts
git commit -m "feat(gst-81): проверка уникальности текста страниц по 5-словным фрагментам"
```

---

### Task 2: Страница трейд-ина

**Files:**
- Create: `src/data/trade-in.ts`, `app/trade-in/page.tsx`
- Modify: `src/components/sell/PopularBuyoutPrices.tsx` (пропсы `title`, `intro`; атрибут `data-shared-block`), `src/components/AvitoReviews.tsx` (атрибут `data-shared-block`), `src/components/Footer.tsx`, `src/views/Sell.tsx`, `src/views/Buy.tsx`, `app/sitemap.ts`, `public/llms.txt`
- Test: `tests/trade-in.test.ts`

**Interfaces:**
- Produces: `TRADE_IN_BONUS_PERCENT: number | null`; `tradeInBonusText(percent: number | null): string`; `tradeInFaq(percent: number | null): { question: string; answer: string }[]`; `TRADE_IN_STEPS`, `TRADE_IN_OPTIONS`, `TRADE_IN_COMPARISON`; `PopularBuyoutPrices({ slugs?, allLink?, title?, intro? })`.

- [ ] **Step 1: Падающий тест** — `tests/trade-in.test.ts`:

```ts
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
```

- [ ] **Step 2: Убедиться, что падает.** Run: `npm test` · Expected: `Cannot find module '…/src/data/trade-in.ts'`.

- [ ] **Step 3: Данные** — `src/data/trade-in.ts`:

```ts
/**
 * Трейд-ин макбука (GST-81, docs/seo-batch2-GST-81.md). Условия подтверждены
 * владельцем: в зачёт б/у Mac из наличия и нового под заказ; при зачёте
 * доплачиваем процент к цене выкупа. Размер процента задаёт владелец — пока
 * его нет (null), на странице без цифры. Без рантайм-импортов: файл читает
 * `node --test`.
 */
export const TRADE_IN_BONUS_PERCENT: number | null = null;

export function tradeInBonusText(percent: number | null): string {
  if (percent !== null && percent > 0) return `доплатим +${percent}% к цене выкупа вашего Mac`;
  return 'доплатим процент к цене выкупа вашего Mac — точный размер назовём при оценке';
}

export const TRADE_IN_STEPS = [
  {
    title: 'Оцениваем старый Mac',
    text: 'Посчитайте цену в калькуляторе выкупа или пришлите фото и скриншот «Об этом Mac» — назовём сумму за 15 минут.',
  },
  {
    title: 'Выбираете, что взять взамен',
    text: 'Б/у MacBook из нашего наличия или новый Mac под заказ — подскажем конфигурацию под ваши задачи.',
  },
  {
    title: 'Одна встреча',
    text: 'Проверяем старый Mac при вас, засчитываем его в покупку, вы доплачиваете разницу. Договор купли-продажи, оплата наличными или переводом.',
  },
];

export const TRADE_IN_OPTIONS = [
  {
    title: 'В зачёт б/у Mac из наличия',
    text: 'Проверенные MacBook с гарантией 1 месяц. Старый сдаёте и новый забираете на одной встрече.',
    href: '/buy',
    cta: 'Смотреть, что есть в наличии →',
    external: false,
  },
  {
    title: 'В зачёт нового Mac под заказ',
    text: 'Новый MacBook, iMac или Mac mini в нужной конфигурации. Старый Mac засчитываем, когда вы получаете новый.',
    href: 'https://t.me/romanmanro',
    cta: 'Узнать цену и сроки в Telegram →',
    external: true,
  },
];

export const TRADE_IN_COMPARISON = {
  columns: ['Трейд-ин в BestMac', 'Продать на Авито самому', 'Сдать в скупку'],
  rows: [
    { label: 'Встречи', cells: ['Одна', 'Несколько: показы покупателям, потом покупка нового', 'Одна, но новый Mac ищете отдельно'] },
    { label: 'Сроки', cells: ['С б/у из наличия — в день обращения', 'От нескольких дней до недель', 'В день обращения'] },
    { label: 'Сумма за старый Mac', cells: ['Цена выкупа и процент сверху при зачёте', 'Выше, если найдётся покупатель без торга', 'Цена выкупа'] },
    { label: 'Риски', cells: ['Договор, проверка при вас', 'Торг, отмены, мошенники', 'Зависят от скупки'] },
  ],
};

export function tradeInFaq(percent: number | null): { question: string; answer: string }[] {
  return [
    {
      question: 'Можно ли сдать в трейд-ин сломанный Mac?',
      answer: 'Да. Неисправный Mac оцениваем от цены исправного такой же конфигурации за вычетом ремонта и засчитываем эту сумму в покупку.',
    },
    {
      question: 'Как считается доплата при трейд-ине?',
      answer: `Цена старого Mac — это цена выкупа по данным рынка; при трейд-ине ${tradeInBonusText(percent)}. Разницу со стоимостью нового Mac доплачиваете вы.`,
    },
    {
      question: 'Можно ли сдать два устройства сразу?',
      answer: 'Да, например MacBook и iMac: суммы за оба устройства засчитываем в одну покупку.',
    },
    {
      question: 'Сколько времени занимает трейд-ин?',
      answer: 'Оценка по фото — 15 минут. На встрече проверяем старый Mac и оформляем договор, обычно это укладывается в полчаса.',
    },
    {
      question: 'Какие документы нужны для трейд-ина?',
      answer: 'Только паспорт. Оформляем договор купли-продажи, доплата — наличными или переводом.',
    },
    {
      question: 'Можно ли сдать Mac в трейд-ин в Apple?',
      answer: 'Официальных магазинов Apple в России нет, программы Apple Trade In здесь тоже нет — сдать старый MacBook в зачёт другого можно у независимых продавцов, например у нас.',
    },
  ];
}
```

- [ ] **Step 4: Тесты проходят.** Run: `npm test` · Expected: `ℹ fail 0`.

- [ ] **Step 5: Блоки цен и отзывов** — в `src/components/sell/PopularBuyoutPrices.tsx` заменить сигнатуру и шапку секции:

```tsx
const DEFAULT_INTRO =
  'Цена выкупа за самую дорогую конфигурацию модели, по которой у нас надёжные данные: свежие '
  + 'объявления Авито или наши сделки. Точную сумму за ваш Mac назовём по фото за 15 минут.';

export default async function PopularBuyoutPrices(
  { slugs, allLink = false, title = 'Сколько мы платим сейчас', intro = DEFAULT_INTRO }:
  { slugs?: string[]; allLink?: boolean; title?: string; intro?: string } = {},
) {
```

а разметку секции — на:

```tsx
    // data-shared-block: общий блок нескольких страниц — проверка уникальности (GST-81) его не считает
    <section className="mb-12" id="skolko-platim" data-shared-block="prices">
      <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{intro}</p>
```

(старый текст абзаца переезжает в `DEFAULT_INTRO`, остальное без изменений). В `src/components/AvitoReviews.tsx` корневой `<section className="py-12">` заменить на `<section className="py-12" data-shared-block="reviews">`.

- [ ] **Step 6: Страница** — `app/trade-in/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeadForm from '@/components/LeadForm';
import AvitoReviews from '@/components/AvitoReviews';
import PopularBuyoutPrices from '@/components/sell/PopularBuyoutPrices';
import { POPULAR_MODELS } from '@/lib/model-slugs';
import {
  TRADE_IN_BONUS_PERCENT, tradeInBonusText, tradeInFaq,
  TRADE_IN_STEPS, TRADE_IN_OPTIONS, TRADE_IN_COMPARISON,
} from '@/data/trade-in';

export const metadata: Metadata = {
  title: 'Трейд-ин макбука в Москве — сдать MacBook в зачёт нового или б/у',
  description:
    'Трейд-ин MacBook, iMac и Mac mini в Москве: сдайте старый макбук в зачёт б/у Mac из наличия или нового под заказ. Доплачиваем к цене выкупа, одна встреча, договор.',
  alternates: { canonical: '/trade-in' },
};

// GST-81: ~200 запросов в месяц по Москве («трейд ин макбук», «сдать макбук в трейд ин»).
export default function TradeInPage() {
  const bonus = tradeInBonusText(TRADE_IN_BONUS_PERCENT);
  const faq = tradeInFaq(TRADE_IN_BONUS_PERCENT);
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <main className="container mx-auto px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Выкуп', url: '/sell' },
          { name: 'Трейд-ин', url: '/trade-in' },
        ]} />

        <h1 className="text-3xl md:text-5xl font-bold mb-4">Трейд-ин макбука: сдайте старый MacBook в зачёт другого</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Меняете Mac на более новый? Сдайте старый нам в зачёт: {bonus}. Всё решаем на одной
          встрече у м. Киевская или с выездом по Москве: проверяем старый Mac, засчитываем его
          и оформляем покупку.
        </p>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Как проходит трейд-ин</h2>
          <ol className="grid md:grid-cols-3 gap-4">
            {TRADE_IN_STEPS.map((s, i) => (
              <li key={s.title} className="bg-card border border-border/60 rounded-xl p-5">
                <div className="text-primary font-bold mb-2">Шаг {i + 1}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Что можно взять в зачёт старого Mac</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {TRADE_IN_OPTIONS.map((o) => (
              <div key={o.title} className="bg-card border border-border/60 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">{o.title}</h3>
                <p className="text-muted-foreground mb-4">{o.text}</p>
                {o.external ? (
                  <a href={o.href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{o.cta}</a>
                ) : (
                  <Link href={o.href} className="text-primary underline">{o.cta}</Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Почему трейд-ин удобнее, чем продавать самому</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>При зачёте {bonus}.</li>
            <li>Одна встреча вместо двух сделок: не нужно сначала продавать старый MacBook, а потом искать новый.</li>
            <li>Не нужно выставлять объявление на Авито, торговаться и встречаться с незнакомыми покупателями.</li>
            <li>Официальных магазинов Apple в России нет, программы Apple Trade In тоже — зачёт старого Mac остаётся за независимыми продавцами.</li>
          </ul>
        </section>

        <PopularBuyoutPrices
          slugs={POPULAR_MODELS.map((m) => m.slug)}
          allLink
          title="Сколько стоит ваш старый Mac сейчас"
          intro={`Цена выкупа за самую дорогую конфигурацию модели по свежим данным рынка. При трейд-ине ${bonus}.`}
        />

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Трейд-ин, продажа на Авито или скупка</h2>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-3" />
                  {TRADE_IN_COMPARISON.columns.map((c) => <th key={c} className="p-3 font-semibold">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {TRADE_IN_COMPARISON.rows.map((r) => (
                  <tr key={r.label} className="border-t border-border/60">
                    <th className="p-3 text-left font-medium">{r.label}</th>
                    {r.cells.map((c, i) => <td key={i} className="p-3 text-muted-foreground">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Частые вопросы о трейд-ине</h2>
          <div className="space-y-4">
            {faq.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AvitoReviews limit={3} />

      <div className="max-w-3xl mx-auto">
        <LeadForm
          formType="sell"
          title="Заявка на трейд-ин"
          subtitle="Напишите, какой Mac сдаёте и какой хотите взять, — посчитаем доплату"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Ссылки на страницу.**

`src/components/Footer.tsx` — после строки `<li><Link href="/sell" …>Продать технику</Link></li>`:

```tsx
              <li><Link href="/trade-in" className="hover:text-foreground transition-colors">Трейд-ин</Link></li>
```

`src/views/Sell.tsx` — после сетки «Выкупаем другие компьютеры Apple», то есть сразу после фрагмента

```tsx
                        <p className="text-sm text-muted-foreground">Сломанные, залитые, заблокированные</p>
                      </div>
                    </Link>
                  </div>
```

вставить:

```tsx
                  <p className="text-center mt-6">
                    <Link href="/trade-in" className="text-primary underline">
                      Меняете Mac на другой? Сдайте старый в трейд-ин — доплатим к цене выкупа →
                    </Link>
                  </p>
```

`src/views/Buy.tsx` — добавить `import Link from "next/link";` к импортам и после абзаца, который заканчивается `самовывоз или доставка по Москве.` и `</p>`, вставить:

```tsx
            <p className="mt-4">
              <Link href="/trade-in" className="text-primary underline">
                Есть старый Mac? Сдайте его в трейд-ин — доплатим к цене выкупа
              </Link>
            </p>
```

`app/sitemap.ts` — после `{ url: '/sell/broken', changeFrequency: 'weekly', priority: 0.7 },`:

```ts
    { url: '/trade-in', changeFrequency: 'monthly', priority: 0.8 },
```

`public/llms.txt` — после строки «Оценка MacBook онлайн»:

```
- [Трейд-ин макбука](https://bestmac.ru/trade-in): сдать старый Mac в зачёт б/у из наличия или нового под заказ, с доплатой к цене выкупа
```

- [ ] **Step 8: Тесты.** Run: `npm test` · Expected: `ℹ fail 0`.

- [ ] **Step 9: Коммит**

```bash
git add src/data/trade-in.ts tests/trade-in.test.ts app/trade-in/page.tsx src/components/sell/PopularBuyoutPrices.tsx src/components/AvitoReviews.tsx src/components/Footer.tsx src/views/Sell.tsx src/views/Buy.tsx app/sitemap.ts public/llms.txt
git commit -m "feat(gst-81): страница «Трейд-ин макбука» и ссылки на неё"
```

---

### Task 3: Хаб «сломанный макбук»

**Files:**
- Create: `src/data/broken-hub.ts`, `src/views/sell/SellBrokenHub.tsx`
- Modify: `app/sell/broken/page.tsx`
- Delete: `src/views/sell/SellBroken.tsx` (после проверки, что больше не импортируется)
- Test: `tests/broken-hub.test.ts`

**Interfaces:**
- Consumes: `VYKUP_LANDINGS` из `src/data/vykup-landings.ts`; `PopularBuyoutPrices` с пропсами `title`, `intro` (Task 2).
- Produces: `BROKEN_SECTIONS: { id: string; title: string; text: string; link?: { href: string; label: string } }[]`; `BROKEN_PRICING: string`; `BROKEN_FAQ: { question: string; answer: string }[]`.

- [ ] **Step 1: Падающий тест** — `tests/broken-hub.test.ts`:

```ts
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
```

- [ ] **Step 2: Убедиться, что падает.** Run: `npm test` · Expected: `Cannot find module '…/src/data/broken-hub.ts'`.

- [ ] **Step 3: Данные** — `src/data/broken-hub.ts`:

```ts
/**
 * Хаб «сломанный макбук» /sell/broken (GST-81). Хаб разбирает поломки и ведёт
 * на узкие страницы /vykup/*, а не повторяет их текст. Без выдуманных сумм
 * ремонта: точную цену называем по фото. Без рантайм-импортов.
 */
export const BROKEN_SECTIONS: { id: string; title: string; text: string; link?: { href: string; label: string } }[] = [
  {
    id: 'ekran',
    title: 'Разбитый экран или матрица',
    text: 'Трещина, полосы или пятна на экране — самая частая поломка. Замена матрицы у MacBook на Apple Silicon дорогая, поэтому мы учитываем её в цене, а не отказываем: корпус, клавиатура, батарея и плата сохраняют свою стоимость.',
  },
  {
    id: 'ne-vklyuchaetsya',
    title: 'Макбук не включается',
    text: 'Причины разные — от севшей батареи и неисправной зарядки до платы. Сначала подключите заведомо рабочий адаптер питания и подождите 20–30 минут. Если Mac так и не включился, пришлите фото и серийный номер с нижней крышки — оценим как неисправный.',
  },
  {
    id: 'zalit',
    title: 'После залития',
    text: 'Отключите питание и не пытайтесь включать и заряжать — так плата пострадает меньше. Чинить перед продажей не нужно: выкупаем залитые MacBook как есть.',
    link: { href: '/vykup/zalitogo-macbook', label: 'Как выкупаем залитые MacBook →' },
  },
  {
    id: 'blokirovka',
    title: 'Заблокирован iCloud или MDM',
    text: 'Если Mac привязан к чужому Apple ID или на нём стоит профиль MDM компании, выкупаем дешевле исправного. Если Apple ID ваш — выйдите из него перед встречей, и цена будет как за незаблокированный.',
    link: { href: '/vykup/zablokirovannogo-macbook', label: 'Выкуп заблокированных MacBook →' },
  },
  {
    id: 'zapchasti',
    title: 'На запчасти',
    text: 'Даже полностью нерабочий MacBook ценен деталями: дисплей, корпус, клавиатура, батарея, динамики. Такой Mac оцениваем по состоянию деталей.',
    link: { href: '/vykup/na-zapchasti', label: 'Выкуп MacBook на запчасти →' },
  },
];

export const BROKEN_PRICING =
  'Берём цену исправного Mac такой же конфигурации — её видно в таблице ниже и на странице модели — '
  + 'и вычитаем стоимость ремонта и риск. Поэтому точную сумму называем по фото: так быстрее и честнее, '
  + 'чем гадать по описанию поломки.';

export const BROKEN_FAQ = [
  {
    question: 'Сколько стоит сломанный макбук?',
    answer: 'Зависит от поломки и модели: считаем от цены исправного Mac такой же конфигурации за вычетом ремонта. Точную сумму назовём по фото за 15 минут.',
  },
  {
    question: 'Покупаете ли макбук, который не включается?',
    answer: 'Да. Оцениваем по фото и серийному номеру с нижней крышки: даже нерабочий Mac ценен деталями.',
  },
  {
    question: 'Что делать, если залил макбук?',
    answer: 'Сразу отключите питание, не заряжайте и не включайте его. Напишите нам — выкупим как есть, сначала чинить не нужно.',
  },
  {
    question: 'Выкупаете ли заблокированные MacBook?',
    answer: 'Да, с привязкой к iCloud или профилем MDM — дешевле исправного. Если Apple ID ваш, выйдите из него перед встречей, и цена будет выше.',
  },
  {
    question: 'Нужно ли чинить макбук перед продажей?',
    answer: 'Обычно нет: ремонт в сервисе часто стоит больше, чем прибавка к цене. Мы учитываем поломку в оценке, поэтому продавать можно как есть.',
  },
  {
    question: 'Как проходит продажа сломанного MacBook?',
    answer: 'Оценка по фото, встреча у м. Киевская или выезд по Москве, проверка при вас и деньги сразу — наличными или переводом, по договору.',
  },
];
```

- [ ] **Step 4: Тесты проходят.** Run: `npm test` · Expected: `ℹ fail 0`.

- [ ] **Step 5: Серверная страница** — `src/views/sell/SellBrokenHub.tsx`:

```tsx
import Breadcrumbs from '@/components/Breadcrumbs';
import PhotoEstimate from '@/components/PhotoEstimate';
import LeadForm from '@/components/LeadForm';
import AvitoReviews from '@/components/AvitoReviews';
import PopularBuyoutPrices from '@/components/sell/PopularBuyoutPrices';
import Link from 'next/link';
import { POPULAR_MODELS } from '@/lib/model-slugs';
import { BROKEN_SECTIONS, BROKEN_PRICING, BROKEN_FAQ } from '@/data/broken-hub';

/**
 * /sell/broken — серверный хаб «сломанный макбук» (GST-81). Раньше страница была
 * клиентской, ~2,5 тыс. знаков, и текст почти не попадал в HTML.
 */
export default function SellBrokenHub() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: BROKEN_FAQ.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <main className="container mx-auto px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Выкуп', url: '/sell' },
          { name: 'Сломанный макбук', url: '/sell/broken' },
        ]} />

        <h1 className="text-3xl md:text-5xl font-bold mb-4">Сломался MacBook? Мы купим его сегодня.</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Разбили экран, залили, перестал включаться или заблокирован iCloud — выкупаем макбуки
          в любом состоянии. Пришлите фото — назовём цену за 15 минут. Деньги сразу после проверки:
          наличными или переводом.
        </p>
        <p className="mb-10">
          <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer"
             className="inline-block rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold">
            Отправить фото в Telegram
          </a>
        </p>

        <section className="mb-12">
          <PhotoEstimate />
        </section>

        {BROKEN_SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{s.title}</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">{s.text}</p>
            {s.link && <Link href={s.link.href} className="text-primary underline">{s.link.label}</Link>}
          </section>
        ))}

        <section className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Как мы считаем цену сломанного MacBook</h2>
          <p className="text-muted-foreground leading-relaxed">{BROKEN_PRICING}</p>
        </section>

        <PopularBuyoutPrices
          slugs={POPULAR_MODELS.map((m) => m.slug)}
          title="Цены исправных Mac — от них считаем сломанный"
          intro="Цена выкупа исправного Mac за самую дорогую конфигурацию модели. Для сломанного вычитаем стоимость ремонта — точную сумму назовём по фото."
        />

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Частые вопросы о продаже сломанного макбука</h2>
          <div className="space-y-4">
            {BROKEN_FAQ.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AvitoReviews limit={3} />

      <div className="max-w-3xl mx-auto">
        <LeadForm formType="sell" title="Оценка сломанного Mac" subtitle="Опишите поломку и пришлите фото — назовём цену за 15 минут" />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Подключить и удалить старую страницу.** В `app/sell/broken/page.tsx` заменить `import SellBroken from '@/views/sell/SellBroken';` на `import SellBrokenHub from '@/views/sell/SellBrokenHub';` и `return <SellBroken />;` на `return <SellBrokenHub />;`. Затем:

```bash
git grep -n "views/sell/SellBroken'\|views/sell/SellBroken\"" -- app src
```

Expected: пусто. Удалить `src/views/sell/SellBroken.tsx`.

- [ ] **Step 7: Тесты.** Run: `npm test` · Expected: `ℹ fail 0`.

- [ ] **Step 8: Коммит**

```bash
git add src/data/broken-hub.ts tests/broken-hub.test.ts src/views/sell/SellBrokenHub.tsx app/sell/broken/page.tsx
git rm -q src/views/sell/SellBroken.tsx
git commit -m "feat(gst-81): /sell/broken — серверный хаб «сломанный макбук»"
```

---

### Task 4: `/ceny` — «Сколько стоит б/у макбук сегодня»

**Files:**
- Create: `src/data/ceny-faq.ts`
- Modify: `app/ceny/page.tsx`
- Test: `tests/ceny-faq.test.ts`

**Interfaces:**
- Consumes: `loadAvitoPricesServer()` (`src/lib/server-prices.ts`) — поле `total_listings`.
- Produces: `CENY_FAQ: { question: string; answer: string }[]`.

- [ ] **Step 1: Падающий тест** — `tests/ceny-faq.test.ts`:

```ts
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
```

- [ ] **Step 2: Убедиться, что падает.** Run: `npm test` · Expected: `Cannot find module '…/src/data/ceny-faq.ts'`.

- [ ] **Step 3: Данные** — `src/data/ceny-faq.ts`:

```ts
/**
 * FAQ страницы цен /ceny (GST-81) — под запросы «макбука сколько продают»,
 * «за сколько можно продать макбук», «сколько стоит макбук бу». Без импортов.
 */
export const CENY_FAQ = [
  {
    question: 'За сколько можно продать макбук?',
    answer: 'Ориентир — медиана в таблице: по такой цене продают на Авито. Если нужно быстро и без встреч с покупателями, выкуп — часть медианы, но деньги сразу; посчитать его можно в калькуляторе выкупа.',
  },
  {
    question: 'Сколько продают макбук эйр и про?',
    answer: 'Цены по каждой модели — в таблицах выше, а по конфигурациям (чип, память, диск) — на странице модели: MacBook Air и MacBook Pro разделены по диагонали и году.',
  },
  {
    question: 'Почему в скупке дешевле, чем на Авито?',
    answer: 'Цена в объявлении — это цена, за которую хотят продать, а не итог сделки. Скупка платит сразу и берёт на себя проверку, риски и время на перепродажу — отсюда разница.',
  },
  {
    question: 'Как часто обновляются цены?',
    answer: 'Ежедневно — дата последнего обновления указана вверху страницы. Считаем по объявлениям Авито в Москве, отдельно по каждой модели.',
  },
];
```

- [ ] **Step 4: Тесты проходят.** Run: `npm test` · Expected: `ℹ fail 0`.

- [ ] **Step 5: Страница** — в `app/ceny/page.tsx`:

импорты дополнить:

```tsx
import { loadAvitoPricesServer } from '@/lib/server-prices';
import { CENY_FAQ } from '@/data/ceny-faq';
```

`metadata` заменить на:

```tsx
export const metadata: Metadata = {
  title: 'Сколько стоит б/у макбук сегодня — цены на MacBook в Москве',
  description:
    'Сколько стоит б/у макбук сегодня: цены MacBook Air, MacBook Pro, iMac, Mac mini и Mac Studio в Москве по объявлениям Авито — минимальная, медиана и максимальная. Обновляется ежедневно.',
  alternates: { canonical: '/ceny' },
};
```

в начале `PriceIndexPage` после `const updated = humanDate(generatedAt);`:

```tsx
  const listings = (await loadAvitoPricesServer())?.total_listings ?? 0;
  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: CENY_FAQ.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
```

в JSON-LD: `'@graph': [breadcrumb, itemList]` → `'@graph': [breadcrumb, itemList, faqSchema]`.

H1 и первый абзац заменить на:

```tsx
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Сколько стоит б/у макбук сегодня
          </h1>

          <p className="text-muted-foreground leading-relaxed mb-3 max-w-3xl">
            Цена б/у макбука зависит от модели, чипа, памяти и диска. Здесь — цены продажи
            MacBook Air, MacBook Pro, iMac, Mac mini и Mac Studio в Москве
            {listings > 0 ? ` по ${listings.toLocaleString('ru-RU')} объявлениям Авито` : ' по объявлениям Авито'}:
            минимальная, медиана и максимальная по каждой модели. Выберите модель, чтобы увидеть
            цену по конфигурациям.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-2 max-w-3xl">
            Цена продажи на Авито и цена выкупа — разные вещи: объявление показывает, за сколько хотят
            продать, а скупка платит сразу и берёт на себя проверку и риски. Цену выкупа вашего Mac
            покажет <Link href="/sell" className="text-primary hover:underline">калькулятор выкупа</Link>.
          </p>
```

перед закрывающими `</div>` и `</main>` (после секции «Как формируются цены») добавить:

```tsx
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Частые вопросы о ценах на б/у макбуки</h2>
            <div className="space-y-4">
              {CENY_FAQ.map((f) => (
                <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                  <h3 className="font-semibold mb-2">{f.question}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
```

- [ ] **Step 6: Тесты.** Run: `npm test` · Expected: `ℹ fail 0`.

- [ ] **Step 7: Коммит**

```bash
git add src/data/ceny-faq.ts tests/ceny-faq.test.ts app/ceny/page.tsx
git commit -m "feat(gst-81): /ceny отвечает на «сколько стоит б/у макбук»"
```

---

### Task 5: Проверка на собранном сайте и выкатка

- [ ] **Step 1: Сборка в чистой копии**

```bash
B=/private/tmp/claude-501/-Users-a1111-Desktop-bestmac-avito-apple/2db040c6-328f-47e3-a8a6-55908b14d68c/scratchpad/build-gst81
rm -rf "$B" && mkdir -p "$B"
git ls-files -z --cached --others --exclude-standard | grep -zv ' 2\.\| 2/\| 3\.' | rsync -a --from0 --files-from=- ./ "$B/"
find "$B/src" -depth -type d -empty -delete
cd "$B" && npm ci --no-audit --no-fund --loglevel=error && npm test && npx tsc --noEmit -p . && NEXT_TELEMETRY_DISABLED=1 npx next build > build.log 2>&1; echo build=$?
```

Expected: `ℹ fail 0`, tsc без ошибок, `build=0`.

- [ ] **Step 2: Страницы в HTML**

```bash
cd "$B" && (npx next start -p 3930 > start.log 2>&1 &); for i in $(seq 1 30); do curl -s -o /dev/null localhost:3930/ && break; sleep 1; done
for u in /trade-in /sell/broken /ceny; do curl -s localhost:3930$u | python3 -c "
import sys,re,html; h=sys.stdin.read()
t=re.search(r'<title>(.*?)</title>',h); h1=re.search(r'<h1[^>]*>(.*?)</h1>',h,re.S)
print('$u', '|', html.unescape(t.group(1)) if t else '-', '|', re.sub(r'<[^>]+>','',h1.group(1)) if h1 else '-', '| FAQPage' if 'FAQPage' in h else '| НЕТ FAQPage', '| null%' if 'null%' in h else '')"; done
curl -s localhost:3930/sitemap.xml | grep -c '/trade-in<'
curl -s localhost:3930/sell | grep -c 'href="/trade-in"'
```

Expected: три строки с нужными title/H1 и «FAQPage», без «null%»; sitemap — 1; ссылка на `/trade-in` на `/sell` — 1 и больше.

- [ ] **Step 3: Уникальность**

```bash
cd "$B" && node tests/tools/check-uniqueness.mts http://localhost:3930; echo exit=$?; pkill -f "next start -p 3930"
```

Expected: три строки `✅`, `exit=0`. Если `❌` — переписать совпадающие абзацы на своей странице (не трогая соседнюю), повторить Steps 1–3.

- [ ] **Step 4: PR и мерж** — ветка, `git push`, `gh pr create` с описанием трёх страниц и результатами Steps 1–3; мерж после одобрения владельца.

- [ ] **Step 5: После мержа** — дождаться выкатки (на проде `https://bestmac.ru/trade-in` отдаёт 200), отправить на переобход в Вебмастере `/trade-in`, `/sell/broken`, `/ceny`, `/sell`, `/buy`.
