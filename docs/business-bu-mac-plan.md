# /business · Б/у MacBook для компаний — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переделать `/business` в серверную страницу «Б/у MacBook для компаний» с ценами из базы и только подтверждёнными условиями.

**Architecture:** Чистая функция `officePriceRows` в `src/lib/sell-prices.ts` выбирает для офисных моделей типичную надёжную конфигурацию. Тексты и FAQ — модуль данных `src/data/business.ts` без рантайм-импортов. `app/business/page.tsx` — серверный компонент по образцу `app/trade-in/page.tsx`; клиентский `src/views/Business.tsx` и `faqData.business` удаляются.

**Tech Stack:** Next.js 16 App Router (SSG), TypeScript, Tailwind, `node --test` (Node 23 запускает `.ts` без сборки).

**Spec:** `docs/business-bu-mac.md`

## Global Constraints

- Ветка `feat/business-bu-macbook`, в коммиты — только явные пути (в репо есть iCloud-дубли « 2»).
- Модули, которые импортируют тесты (`src/lib/sell-prices.ts`, `src/data/business.ts`), — без рантайм-импортов через `@/`; только `import type`.
- Условия: ИП **без НДС**, безнал на расчётный счёт; документы — **договор, счёт, акт и ТОРГ-12**; партии под заказ, срок — «в КП, зависит от модели»; гарантия — «условия фиксируем в договоре».
- Запрещено в текстах страницы: «лизинг», «рассрочк», «счёт-фактур», «счет-фактур», «персональный менеджер», «iPad», «до 3 месяцев», «40%», «техподдержк».
- Уникальность: ≤ 40% общих 5-словных фрагментов с любой другой страницей (`tests/tools/check-uniqueness.mts`).
- Цена в таблице — `medianPrice` рыночной (не ручной) надёжной конфигурации; цену выкупа не показывать.
- Никакой разметки `Review` / `AggregateRating`.

## Review Focus

1. У модели надёжна только ручная (`manual_override`) конфигурация → модели нет в таблице: «медиана Авито» не может быть цифрой владельца.
2. Две конфигурации с одинаковым числом объявлений → выбирается младшая (меньше память, потом диск), результат детерминирован.
3. Slug из списка офисных моделей отсутствует в каталоге → строка молча пропускается, сборка не падает; тест держит список в согласии с `BUYOUT_MODELS`.
4. База не прочиталась (`null`) → раздела цен нет, остальная страница строится.
5. Строки модели лежат под двумя названиями в базе → название без ссылки на `/ceny/…` (как на страницах моделей), а не ссылка на несуществующую страницу.

---

### Task 1: `officePriceRows` — строки таблицы цен

**Files:**
- Modify: `src/lib/sell-prices.ts` (добавить в конец файла)
- Test: `tests/business-prices.test.ts` (создать)

**Interfaces:**
- Consumes: `buildSellModelPrices(stats, match, now): SellModelPrices`, `ageDays(updatedAt, now)`, `SellConfig`, `SellMatch` — уже есть в `src/lib/sell-prices.ts` и `src/lib/model-slugs.ts`.
- Produces:
  ```ts
  export interface OfficePriceRow { slug: string; name: string; config: SellConfig; sourceModelNames: string[] }
  export function officePriceRows(
    stats: AvitoPriceStat[] | null | undefined,
    catalog: Array<{ name: string; slug: string; match: SellMatch }>,
    slugs: string[],
    now: Date,
  ): { rows: OfficePriceRow[]; latestUpdate: string | null }
  ```

- [ ] **Step 1: Write the failing test** — `tests/business-prices.test.ts`:

```ts
// /business: типичная конфигурация офисных моделей (docs/business-bu-mac.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { officePriceRows } from '../src/lib/sell-prices.ts';

const NOW = new Date('2026-09-27T12:00:00');
const row = (name: string, processor: string, ram: number, ssd: number, median: number,
             n: number, upd = '2026-09-25 10:00', extra: Record<string, unknown> = {}) => ({
  model_name: name, processor, ram, ssd, buyout_price: Math.round(median * 0.8),
  median_price: median, min_price: median, max_price: median,
  samples_count: n, updated_at: upd, ...extra,
});
const CATALOG = [
  { name: 'MacBook Air 13 (2020, M1)', slug: 'air-m1', match: { family: 'MacBook Air', screen: 13, chip: 'M1' } },
  { name: 'MacBook Air 13 (2022, M2)', slug: 'air-m2', match: { family: 'MacBook Air', screen: 13, chip: 'M2' } },
  { name: 'MacBook Pro 14 (2021, M1 Pro)', slug: 'pro-m1pro', match: { family: 'MacBook Pro', screen: 14, chip: 'M1 Pro' } },
];

test('типичная — надёжная рыночная конфигурация с наибольшим числом объявлений; цена — медиана', () => {
  const stats = [
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 256, 62990, 23),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 16, 512, 80000, 7),
  ];
  const { rows } = officePriceRows(stats, CATALOG, ['air-m2'], NOW);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, 'air-m2');
  assert.equal(rows[0].name, 'MacBook Air 13 (2022, M2)');
  assert.equal(rows[0].config.ram, 8);
  assert.equal(rows[0].config.medianPrice, 62990);
  assert.deepEqual(rows[0].sourceModelNames, ['MacBook Air 13 (2022, M2)']);
});

test('ничья по числу объявлений — младшая конфигурация', () => {
  const stats = [
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 16, 256, 76990, 9),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 512, 64999, 9),
  ];
  const { rows } = officePriceRows(stats, CATALOG, ['air-m2'], NOW);
  assert.equal(rows[0].config.ram, 8);
  assert.equal(rows[0].config.ssd, 512);
});

test('модель без надёжных рыночных конфигураций пропускается (старые, мало объявлений, только ручная)', () => {
  const stats = [
    row('MacBook Air 13 (2020, M1)', 'Apple M1', 8, 256, 45000, 13, '2026-07-01 10:00'),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 256, 62990, 3),
    row('MacBook Pro 14 (2021)', 'Apple M1 Pro', 16, 512, 85000, 2, '2026-09-25 10:00', { manual_override: true }),
  ];
  assert.deepEqual(officePriceRows(stats, CATALOG, ['air-m1', 'air-m2', 'pro-m1pro'], NOW).rows, []);
});

test('порядок — как в списке slug-ов; неизвестный slug пропускается', () => {
  const stats = [
    row('MacBook Air 13 (2020, M1)', 'Apple M1', 8, 256, 45000, 13),
    row('MacBook Pro 14 (2021)', 'Apple M1 Pro', 16, 512, 85000, 46),
  ];
  const { rows } = officePriceRows(stats, CATALOG, ['pro-m1pro', 'nope', 'air-m1'], NOW);
  assert.deepEqual(rows.map((r) => r.slug), ['pro-m1pro', 'air-m1']);
});

test('latestUpdate — самая свежая дата среди строк; пустая база — пусто', () => {
  const stats = [
    row('MacBook Air 13 (2020, M1)', 'Apple M1', 8, 256, 45000, 13, '2026-09-20 10:00'),
    row('MacBook Air 13 (2022, M2)', 'Apple M2', 8, 256, 62990, 23, '2026-09-26 09:00'),
  ];
  assert.equal(officePriceRows(stats, CATALOG, ['air-m1', 'air-m2'], NOW).latestUpdate, '2026-09-26 09:00');
  assert.deepEqual(officePriceRows(null, CATALOG, ['air-m1'], NOW), { rows: [], latestUpdate: null });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/business-prices.test.ts`
Expected: FAIL — `officePriceRows` is not exported.

- [ ] **Step 3: Write minimal implementation** — в конец `src/lib/sell-prices.ts`:

```ts
// ─── /business: цены б/у для компаний (docs/business-bu-mac.md) ─────────────
// Компании покупают, а не продают: показываем рыночную медиану типичной
// конфигурации, а не цену выкупа. Ручная цена — цифра владельца, не «медиана
// Авито», поэтому в выбор не входит.

export interface OfficePriceRow {
  slug: string;
  name: string;
  config: SellConfig;           // типичная конфигурация
  sourceModelNames: string[];   // для ссылки на /ceny/<slug>
}

export function officePriceRows(
  stats: AvitoPriceStat[] | null | undefined,
  catalog: Array<{ name: string; slug: string; match: SellMatch }>,
  slugs: string[],
  now: Date,
): { rows: OfficePriceRow[]; latestUpdate: string | null } {
  const rows: OfficePriceRow[] = [];
  if (!stats) return { rows, latestUpdate: null };
  for (const slug of slugs) {
    const m = catalog.find((c) => c.slug === slug);
    if (!m) continue;
    const p = buildSellModelPrices(stats, m.match, now);
    // reliable уже отсортированы по памяти и диску — при ничьей остаётся младшая.
    let typical: SellConfig | null = null;
    for (const c of p.reliable) {
      if (c.manual) continue;
      if (!typical || c.samplesCount > typical.samplesCount) typical = c;
    }
    if (typical) rows.push({ slug, name: m.name, config: typical, sourceModelNames: p.sourceModelNames });
  }
  let latestUpdate: string | null = null;
  for (const r of rows) {
    const age = ageDays(r.config.updatedAt, now);
    if (age === null) continue;
    if (latestUpdate === null || age < (ageDays(latestUpdate, now) ?? Infinity)) latestUpdate = r.config.updatedAt;
  }
  return { rows, latestUpdate };
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/business-prices.test.ts && npm test`
Expected: PASS, все прежние тесты тоже.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sell-prices.ts tests/business-prices.test.ts
git commit -m "feat(business): officePriceRows — типичная конфигурация б/у для компаний"
```

---

### Task 2: Модуль данных `src/data/business.ts`

**Files:**
- Create: `src/data/business.ts`
- Test: `tests/business.test.ts`

**Interfaces:**
- Consumes: ничего (без импортов).
- Produces:
  ```ts
  export const OFFICE_MODEL_SLUGS: string[]
  export const BUSINESS_TERMS: string[]                          // 4 пункта первого экрана
  export const BUSINESS_REASONS: Array<{ title: string; text: string }>
  export const BUSINESS_STEPS: Array<{ title: string; text: string }>  // 5 шагов
  export const BUSINESS_DOCS: string                             // абзац «Документы и оплата»
  export const BUSINESS_FAQ: Array<{ question: string; answer: string; href?: string; linkText?: string }>
  ```

- [ ] **Step 1: Write the failing test** — `tests/business.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/business.test.ts`
Expected: FAIL — cannot find module `src/data/business.ts`.

- [ ] **Step 3: Write implementation** — `src/data/business.ts`:

```ts
/**
 * /business — б/у MacBook для компаний (docs/business-bu-mac.md).
 * Только условия, которые подтвердил владелец: ИП без НДС, безнал, договор,
 * счёт, акт и ТОРГ-12, партии под заказ, гарантия по договору. Без импортов:
 * модуль читают тесты под голым `node --test`.
 */

// Порядок — порядок строк таблицы цен.
export const OFFICE_MODEL_SLUGS = [
  'macbook-air-13-2020-m1',
  'macbook-air-13-2022-m2',
  'macbook-air-13-2024-m3',
  'macbook-air-13-2025-m4',
  'macbook-air-15-2023-m2',
  'macbook-air-15-2024-m3',
  'macbook-air-15-2025-m4',
  'macbook-pro-14-2021-m1-pro',
  'macbook-pro-14-2023-m3-pro',
  'macbook-pro-14-2024-m4-pro',
];

export const BUSINESS_INTRO =
  'Для почты, документов, CRM и видеозвонков MacBook на M1–M3 хватает с запасом, а б/у стоит '
  + 'заметно дешевле нового. Подберём модели под задачи команды, проверим каждый Mac и оформим '
  + 'покупку на компанию.';

export const BUSINESS_TERMS = [
  'Оплата безналом на расчётный счёт, без НДС',
  'Договор, счёт, акт и ТОРГ-12',
  'Партии одинаковых конфигураций под заказ',
  'Гарантия — условия фиксируем в договоре',
];

export const BUSINESS_REASONS = [
  {
    title: 'Дешевле нового',
    text: 'Цены б/у MacBook по объявлениям в Москве — в таблице выше. Для офисных задач разницы с новым сотрудник не заметит.',
  },
  {
    title: 'Можно учесть в расходах сразу',
    text: 'Техника дешевле 100 000 ₽ в налоговом учёте не относится к амортизируемому имуществу. Порядок в бухучёте задаёт учётная политика компании — уточните у бухгалтера.',
  },
  {
    title: 'Долго получает обновления',
    text: 'Mac на чипе M1 2020 года поддерживает macOS 26, выпущенную в 2025 году. Модели на M2 и новее — тем более.',
  },
  {
    title: 'Держит цену',
    text: 'MacBook дешевеет медленнее ноутбуков на Windows. Когда будете обновлять парк, старые Mac выкупим или возьмём в зачёт.',
  },
];

export const BUSINESS_STEPS = [
  { title: 'Задача', text: 'Присылаете, для каких задач нужны Mac, сколько штук и какой бюджет. Или сразу конкретные модели.' },
  { title: 'Коммерческое предложение', text: 'Готовим КП: модели, конфигурации, цена партии и срок сборки.' },
  { title: 'Проверка', text: 'Проверяем каждый Mac: аккумулятор, экран, клавиатуру, порты, отвязку от iCloud и отсутствие профиля MDM.' },
  { title: 'Договор и оплата', text: 'Подписываем договор, выставляем счёт, компания оплачивает на расчётный счёт.' },
  { title: 'Передача', text: 'Отдаём технику в офисе у м. Киевская или привозим к вам по Москве. Передаём акт и ТОРГ-12.' },
];

export const BUSINESS_DOCS =
  'Работаем как ИП без НДС. Для бухгалтерии — договор купли-продажи, счёт, акт и товарная накладная '
  + 'ТОРГ-12; оплата на расчётный счёт. НДС в цене нет, поэтому компания на общей системе '
  + 'налогообложения не примет его к вычету. Для компаний на УСН это не важно.';

export const BUSINESS_FAQ = [
  {
    question: 'Вы работаете с НДС?',
    answer: 'Нет, мы ИП без НДС. В цене НДС нет, поэтому компания на общей системе не примет его к вычету. Для компаний на упрощёнке разницы нет.',
  },
  {
    question: 'Какие документы вы даёте компании?',
    answer: 'Договор купли-продажи, счёт на оплату, акт и товарную накладную ТОРГ-12. Этого достаточно, чтобы поставить технику на учёт.',
  },
  {
    question: 'Какая гарантия на б/у MacBook для компании?',
    answer: 'Условия гарантии фиксируем в договоре. Для партий из нескольких Mac срок обсуждаем отдельно.',
  },
  {
    question: 'Можно купить несколько одинаковых MacBook?',
    answer: 'Да, соберём партию одной модели и конфигурации под заказ. Срок сборки назовём в коммерческом предложении — он зависит от модели.',
  },
  {
    question: 'Как вы проверяете технику перед продажей?',
    answer: 'Каждый Mac: ёмкость и циклы аккумулятора, экран, клавиатура и трекпад, порты, отвязка от iCloud и отсутствие профиля удалённого управления MDM.',
  },
  {
    question: 'Выкупаете ли вы старые Mac компании?',
    answer: 'Да, выкупаем парк от 3 устройств с оплатой на расчётный счёт и документами для списания.',
    href: '/vykup/dlya-yurlits',
    linkText: 'Как проходит выкуп у юрлиц',
  },
];
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/business.test.ts && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/business.ts tests/business.test.ts
git commit -m "feat(business): тексты страницы б/у MacBook для компаний"
```

---

### Task 3: Серверная страница `/business`

**Files:**
- Modify: `app/business/page.tsx` (переписать)
- Delete: `src/views/Business.tsx`
- Modify: `src/lib/schema.ts` — удалить ключ `business` из `faqData` (строки ~238–259), если `grep -rn "faqData.business" src app` после удаления вью пуст
- Modify: `tests/tools/check-uniqueness.mts` — добавить `'/business'` в `OTHERS`

**Interfaces:**
- Consumes: `officePriceRows`, `formatRub`, `configLabel` из `@/lib/sell-prices`; всё из `@/data/business`; `loadAvitoPricesServer` из `@/lib/server-prices`; `ALL_BUYOUT_MODELS`, `modelToSlug` из `@/lib/model-slugs`; `getPriceModelSlugs` из `@/lib/price-pages`; `serviceSchema` из `@/lib/schema`; компоненты `Breadcrumbs`, `LeadForm`, `AvitoReviews`, `TelegramCta`.
- Produces: страница.

- [ ] **Step 1: Переписать `app/business/page.tsx`:**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeadForm from '@/components/LeadForm';
import AvitoReviews from '@/components/AvitoReviews';
import TelegramCta from '@/components/TelegramCta';
import { loadAvitoPricesServer } from '@/lib/server-prices';
import { ALL_BUYOUT_MODELS, modelToSlug } from '@/lib/model-slugs';
import { getPriceModelSlugs } from '@/lib/price-pages';
import { officePriceRows, formatRub, configLabel } from '@/lib/sell-prices';
import { serviceSchema } from '@/lib/schema';
import {
  OFFICE_MODEL_SLUGS, BUSINESS_INTRO, BUSINESS_TERMS, BUSINESS_REASONS,
  BUSINESS_STEPS, BUSINESS_DOCS, BUSINESS_FAQ,
} from '@/data/business';

export const metadata: Metadata = {
  title: 'Б/у MacBook для компаний — безнал без НДС, договор, партии',
  description:
    'Б/у MacBook Air и Pro для офиса и команд: оплата на расчётный счёт, договор, счёт, акт и ТОРГ-12. '
    + 'Партии одинаковых конфигураций под заказ, проверка каждого Mac, Москва.',
  alternates: { canonical: '/business' },
};

function formatUpdated(updatedAt: string): string {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(updatedAt);
  const d = new Date(iso ? `${iso[1]}T12:00:00` : updatedAt);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BusinessPage() {
  const data = await loadAvitoPricesServer();
  const { rows, latestUpdate } = officePriceRows(data?.stats, ALL_BUYOUT_MODELS, OFFICE_MODEL_SLUGS, new Date());
  const cenySlugs = await getPriceModelSlugs();
  const cenyHref = (names: string[]) => {
    const s = names.length === 1 ? modelToSlug(names[0]) : '';
    return s && cenySlugs.includes(s) ? `/ceny/${s}` : null;
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: BUSINESS_FAQ.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
  const service = serviceSchema({
    name: 'Продажа б/у MacBook компаниям',
    description: 'Б/у MacBook для компаний: безнал без НДС, договор, счёт, акт и ТОРГ-12, партии под заказ',
    url: 'https://bestmac.ru/business',
  });

  return (
    <main className="container mx-auto px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Для бизнеса', url: '/business' },
        ]} />

        <h1 className="text-3xl md:text-5xl font-bold mb-4">Б/у MacBook для компаний и команд</h1>
        <p className="text-lg text-muted-foreground mb-6">{BUSINESS_INTRO}</p>
        <ul className="grid sm:grid-cols-2 gap-3 mb-6">
          {BUSINESS_TERMS.map((t) => (
            <li key={t} className="bg-card border border-border/60 rounded-xl p-4 font-medium">{t}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-4 mb-12">
          <a href="#zayavka" className="inline-flex items-center rounded-lg bg-primary px-5 py-3 text-primary-foreground font-semibold">
            Отправить запрос
          </a>
          <TelegramCta />
        </div>

        {rows.length > 0 && (
          <section className="mb-12" id="ceny">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Сколько стоят б/у MacBook для офиса</h2>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="p-3 font-semibold">Модель</th>
                    <th className="p-3 font-semibold">Типичная конфигурация</th>
                    <th className="p-3 font-semibold">Цена на рынке</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const href = cenyHref(r.sourceModelNames);
                    return (
                      <tr key={r.slug} className="border-t border-border/60">
                        <th className="p-3 text-left font-medium">
                          {href ? <Link href={href} className="text-primary underline">{r.name}</Link> : r.name}
                        </th>
                        <td className="p-3 text-muted-foreground">{configLabel(r.config)}</td>
                        <td className="p-3 font-semibold">≈ {formatRub(r.config.medianPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Медиана объявлений на Авито в Москве{latestUpdate ? `, обновлено ${formatUpdated(latestUpdate)}` : ''}.
              Цену партии назовём в КП: она зависит от состояния, комплектации и количества.
            </p>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Почему компании берут б/у Mac</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {BUSINESS_REASONS.map((r) => (
              <div key={r.title} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4">
            Старые Mac сотрудников можно{' '}
            <Link href="/trade-in" className="text-primary underline">сдать в трейд-ин</Link>{' '}
            в зачёт новых.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Как проходит закупка</h2>
          <ol className="grid md:grid-cols-5 gap-4">
            {BUSINESS_STEPS.map((s, i) => (
              <li key={s.title} className="bg-card border border-border/60 rounded-xl p-4">
                <div className="text-primary font-bold mb-2">Шаг {i + 1}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Документы и оплата</h2>
          <p className="text-muted-foreground leading-relaxed">{BUSINESS_DOCS}</p>
        </section>

        <Link href="/vykup/dlya-yurlits" className="block mb-12 bg-card border border-primary/40 hover:border-primary rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-1">Продаёте старый парк при обновлении?</h2>
          <p className="text-muted-foreground text-sm">Выкупим от 3 устройств: безнал и документы для списания →</p>
        </Link>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Частые вопросы компаний</h2>
          <div className="space-y-4">
            {BUSINESS_FAQ.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f.answer}
                  {f.href && <> <Link href={f.href} className="text-primary underline">{f.linkText}</Link></>}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AvitoReviews limit={3} />

      <div className="max-w-3xl mx-auto" id="zayavka">
        <LeadForm
          formType="buy"
          title="Запрос на б/у MacBook для компании"
          subtitle="Напишите, сколько Mac нужно и для каких задач, — пришлём КП"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Удалить старую вью и FAQ**

```bash
git rm src/views/Business.tsx
grep -rn "faqData.business\|views/Business" src app | grep -v " 2\.\| 3\."
```
Expected: пусто (кроме `src/App.tsx` — старый роутер Vite, вне сборки Next; его не трогаем). Затем удалить ключ `business: [...]` из `faqData` в `src/lib/schema.ts`.

- [ ] **Step 3: Уникальность** — в `tests/tools/check-uniqueness.mts` добавить `'/business'` в массив `OTHERS`.

- [ ] **Step 4: Сборка в чистой копии и проверка HTML**

```bash
B=/private/tmp/claude-501/-Users-a1111-Desktop-bestmac-avito-apple/2db040c6-328f-47e3-a8a6-55908b14d68c/scratchpad/biz
rm -rf $B && mkdir -p $B
git ls-files -z --cached --others --exclude-standard | grep -zv ' 2\.\| 2/\| 3\.' | rsync -a --from0 --files-from=- ./ $B/
cd $B && npm ci --silent && npx tsc --noEmit && npm test && npx next build
npx next start -p 3931 &
curl -s localhost:3931/business > /tmp/biz.html
grep -o '<title>[^<]*' /tmp/biz.html; grep -o '<h1[^>]*>[^<]*' /tmp/biz.html
grep -c '<tr class="border-t' /tmp/biz.html           # ≥ 5 строк таблицы
grep -o '"@type":"FAQPage"' /tmp/biz.html
grep -io 'лизинг\|рассрочк\|счёт-фактур\|ipad\|персональный менеджер' /tmp/biz.html   # пусто
node tests/tools/check-uniqueness.mts http://localhost:3931 /business
```
Expected: title и H1 из спеки; ≥ 5 строк; FAQPage есть; запрещённых слов нет; уникальность ≤ 40%.

- [ ] **Step 5: Commit**

```bash
git add app/business/page.tsx src/lib/schema.ts tests/tools/check-uniqueness.mts
git commit -m "feat(business): /business — серверная страница б/у MacBook для компаний"
```

---

### Task 4: PR и после выкатки

- [ ] Пуш ветки и PR в `main` (мерж — только после «влей» владельца: мерж выкатывает прод на Vercel).
- [ ] После мержа: проверить `https://bestmac.ru/business` (title, таблица, FAQ) и отправить переобход `/business` в Вебмастере.
