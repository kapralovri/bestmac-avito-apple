# GST-78 · Страницы выкупа моделей — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на всех 31 странице `/sell/<модель>` калькулятор находит цены, в серверном HTML есть таблица «До X ₽» по надёжным конфигурациям и FAQ, собранный из данных модели.

**Architecture:** каталог моделей получает явные поля сопоставления `match` (семейство, диагональ, чип). Чистый модуль `src/lib/sell-prices.ts` выбирает строки базы по `match`, применяет правило надёжности и собирает FAQ. Серверная страница рисует блок цен и FAQ и передаёт конфигурации клиентскому калькулятору пропсами — калькулятор больше не ищет модель по названию.

**Tech Stack:** Next.js 15 (App Router, SSG), TypeScript, тесты — встроенный `node --test` (Node 23 исполняет TypeScript без зависимостей).

**Spec:** [`docs/sell-model-pages-GST-78.md`](sell-model-pages-GST-78.md)

## Global Constraints

- Надёжная конфигурация: ручная цена (`manual_override`) — всегда; иначе от **5** объявлений и не старше **30** дней на момент сборки; при нарушении порядка цен ненадёжной становится строка пары с меньшим числом объявлений, ручная цена так не снимается.
- Число на странице — `buyout_price`; «До X ₽» — максимум по надёжным конфигурациям.
- Ссылка на Telegram — `https://t.me/romanmanro`.
- Тексты для ненадёжных данных — дословно из спеки: «Точную цену назовём по фото за 15 минут», «Свежих данных по этой модели мало — назовём цену по фото за 15 минут».
- Адреса и sitemap не меняются.
- `src/lib/sell-prices.ts` и `src/lib/model-slugs.ts` не имеют рантайм-импортов (только `import type`) — иначе их не запустить через `node --test`.
- Тесты лежат в `tests/`, импортируют модули с расширением `.ts`; папка `tests` исключена из `tsconfig.json`, иначе сборка Next упадёт на таких импортах.
- Новых npm-зависимостей нет.
- Локальные `node_modules` и `next build` на Рабочем столе сломаны копиями iCloud — сборку проверять только в чистой копии (Task 6).
- В рабочем дереве iCloud плодит копии с « 2». Коммитить **только явно перечисленные пути**, никогда `git add -A`.
- Комментарии в коде — по-русски, объясняют «почему», с меткой `GST-78`.
- Коммиты заканчиваются строкой `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **База не прочиталась или пуста.** Ожидание: страница строится с блоком «по фото», FAQ даёт ответ без цифр, сборка не падает. Тест — Task 2, «нет данных»; Task 3, «FAQ без данных».
2. **Две строки одной конфигурации** (остаток до нормализации). Ожидание: в таблице одна, с большей выборкой. Тест — Task 2.
3. **Дата в старом формате парсера** («Thu Apr 23 16:02:18 2026»). Ожидание: возраст считается, а не «вечно свежий» или «вечно старый». Тест — Task 2.
4. **Ручная цена с маленькой выборкой и дороже большей конфигурации.** Ожидание: остаётся надёжной, снимается соседняя строка. Тест — Task 2.
5. **Название в нижнем регистре** («mac mini m4»). Ожидание: строка всё равно попадает на страницу. Тест — Task 2.

---

### Task 1: Каталог с полями сопоставления и тестовая обвязка

**Files:**
- Modify: `src/lib/model-slugs.ts` — тип `SellMatch`, поле `match` у каждой модели `BUYOUT_MODELS`, функция `modelMatchFromSlug`
- Modify: `tsconfig.json` — исключить `tests`
- Modify: `package.json` — скрипт `test`
- Test: `tests/model-slugs.test.ts`

**Interfaces:**
- Produces:
  - `export interface SellMatch { family: string; screen?: number; chip: string }`;
  - у каждого элемента `BUYOUT_MODELS[...]` поле `match: SellMatch`;
  - `export function modelMatchFromSlug(slug: string): SellMatch | undefined`;
  - команда `npm test` → `node --test tests/`.

- [ ] **Step 1: Написать падающий тест**

`tests/model-slugs.test.ts`:

```ts
// GST-78: каталог моделей /sell с полями сопоставления со строками базы цен.
// Запуск: npm test (Node 23 исполняет TypeScript сам).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_BUYOUT_MODELS, BUYOUT_MODELS, modelMatchFromSlug } from '../src/lib/model-slugs.ts';

test('у каждой из 31 модели заполнено сопоставление', () => {
  assert.equal(ALL_BUYOUT_MODELS.length, 31);
  for (const m of ALL_BUYOUT_MODELS) {
    assert.ok(m.match && m.match.family && m.match.chip, m.name);
  }
});

test('семейство сопоставления совпадает с группой каталога', () => {
  for (const [family, models] of Object.entries(BUYOUT_MODELS)) {
    for (const m of models) assert.equal(m.match.family, family, m.name);
  }
});

test('диагональ есть у ноутбуков и iMac, нет у Mac mini и Mac Studio', () => {
  for (const m of ALL_BUYOUT_MODELS) {
    const desktop = m.match.family === 'Mac mini' || m.match.family === 'Mac Studio';
    assert.equal(m.match.screen === undefined, desktop, m.name);
  }
});

test('чип сопоставления указан в названии модели', () => {
  for (const m of ALL_BUYOUT_MODELS) assert.ok(m.name.includes(m.match.chip), m.name);
});

test('сопоставление по slug', () => {
  assert.deepEqual(modelMatchFromSlug('macbook-pro-14-2023-m3-pro'),
    { family: 'MacBook Pro', screen: 14, chip: 'M3 Pro' });
  assert.deepEqual(modelMatchFromSlug('mac-mini-2024-m4'), { family: 'Mac mini', chip: 'M4' });
  assert.equal(modelMatchFromSlug('net-takoy-modeli'), undefined);
});
```

В `package.json` в `scripts` добавить после `"lint": "next lint",`:

```json
    "test": "node --test tests/",
```

В `tsconfig.json` в `exclude` добавить `"tests"`:

```json
  "exclude": [
    "node_modules",
    "src/main.tsx",
    "src/App.tsx",
    "supabase",
    "tests"
  ]
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `modelMatchFromSlug` не экспортируется (`SyntaxError: The requested module ... does not provide an export named 'modelMatchFromSlug'`).

- [ ] **Step 3: Реализация**

В `src/lib/model-slugs.ts` заменить блок `/** Все модели для выкупа, сгруппированные по семейству */ export const BUYOUT_MODELS = { ... };` на:

```ts
/**
 * GST-78: по чему страница выкупа находит свои строки в базе цен. Название
 * каталога («Mac mini (2024, M4)») и имя строки базы («Mac mini M4») разные,
 * поэтому сопоставление идёт по семейству, диагонали и чипу. screen нет у
 * Mac mini и Mac Studio.
 */
export interface SellMatch {
  family: string;
  screen?: number;
  chip: string;
}

/** Все модели для выкупа, сгруппированные по семейству */
export const BUYOUT_MODELS = {
  'MacBook Air': [
    { name: 'MacBook Air 13 (2020, M1)', slug: 'macbook-air-13-2020-m1', match: { family: 'MacBook Air', screen: 13, chip: 'M1' } },
    { name: 'MacBook Air 13 (2022, M2)', slug: 'macbook-air-13-2022-m2', match: { family: 'MacBook Air', screen: 13, chip: 'M2' } },
    { name: 'MacBook Air 13 (2024, M3)', slug: 'macbook-air-13-2024-m3', match: { family: 'MacBook Air', screen: 13, chip: 'M3' } },
    { name: 'MacBook Air 13 (2025, M4)', slug: 'macbook-air-13-2025-m4', match: { family: 'MacBook Air', screen: 13, chip: 'M4' } },
    { name: 'MacBook Air 15 (2023, M2)', slug: 'macbook-air-15-2023-m2', match: { family: 'MacBook Air', screen: 15, chip: 'M2' } },
    { name: 'MacBook Air 15 (2024, M3)', slug: 'macbook-air-15-2024-m3', match: { family: 'MacBook Air', screen: 15, chip: 'M3' } },
    { name: 'MacBook Air 15 (2025, M4)', slug: 'macbook-air-15-2025-m4', match: { family: 'MacBook Air', screen: 15, chip: 'M4' } },
  ],
  'MacBook Pro': [
    { name: 'MacBook Pro 13 (2020, M1)', slug: 'macbook-pro-13-2020-m1', match: { family: 'MacBook Pro', screen: 13, chip: 'M1' } },
    { name: 'MacBook Pro 13 (2022, M2)', slug: 'macbook-pro-13-2022-m2', match: { family: 'MacBook Pro', screen: 13, chip: 'M2' } },
    { name: 'MacBook Pro 14 (2021, M1 Pro)', slug: 'macbook-pro-14-2021-m1-pro', match: { family: 'MacBook Pro', screen: 14, chip: 'M1 Pro' } },
    { name: 'MacBook Pro 14 (2023, M3 Pro)', slug: 'macbook-pro-14-2023-m3-pro', match: { family: 'MacBook Pro', screen: 14, chip: 'M3 Pro' } },
    { name: 'MacBook Pro 14 (2024, M4 Pro)', slug: 'macbook-pro-14-2024-m4-pro', match: { family: 'MacBook Pro', screen: 14, chip: 'M4 Pro' } },
    { name: 'MacBook Pro 16 (2021, M1 Pro)', slug: 'macbook-pro-16-2021-m1-pro', match: { family: 'MacBook Pro', screen: 16, chip: 'M1 Pro' } },
    { name: 'MacBook Pro 16 (2023, M3 Pro)', slug: 'macbook-pro-16-2023-m3-pro', match: { family: 'MacBook Pro', screen: 16, chip: 'M3 Pro' } },
    { name: 'MacBook Pro 16 (2024, M4 Pro)', slug: 'macbook-pro-16-2024-m4-pro', match: { family: 'MacBook Pro', screen: 16, chip: 'M4 Pro' } },
  ],
  'iMac': [
    { name: 'iMac 27 (2017, Intel)', slug: 'imac-27-2017-intel', match: { family: 'iMac', screen: 27, chip: 'Intel' } },
    { name: 'iMac 27 (2019, Intel)', slug: 'imac-27-2019-intel', match: { family: 'iMac', screen: 27, chip: 'Intel' } },
    { name: 'iMac 27 (2020, Intel)', slug: 'imac-27-2020-intel', match: { family: 'iMac', screen: 27, chip: 'Intel' } },
    { name: 'iMac 24 (2021, M1)', slug: 'imac-24-2021-m1', match: { family: 'iMac', screen: 24, chip: 'M1' } },
    { name: 'iMac 24 (2023, M3)', slug: 'imac-24-2023-m3', match: { family: 'iMac', screen: 24, chip: 'M3' } },
    { name: 'iMac 24 (2024, M4)', slug: 'imac-24-2024-m4', match: { family: 'iMac', screen: 24, chip: 'M4' } },
  ],
  'Mac mini': [
    { name: 'Mac mini (2020, M1)', slug: 'mac-mini-2020-m1', match: { family: 'Mac mini', chip: 'M1' } },
    { name: 'Mac mini (2023, M2)', slug: 'mac-mini-2023-m2', match: { family: 'Mac mini', chip: 'M2' } },
    { name: 'Mac mini (2023, M2 Pro)', slug: 'mac-mini-2023-m2-pro', match: { family: 'Mac mini', chip: 'M2 Pro' } },
    { name: 'Mac mini (2024, M4)', slug: 'mac-mini-2024-m4', match: { family: 'Mac mini', chip: 'M4' } },
    { name: 'Mac mini (2024, M4 Pro)', slug: 'mac-mini-2024-m4-pro', match: { family: 'Mac mini', chip: 'M4 Pro' } },
  ],
  'Mac Studio': [
    { name: 'Mac Studio (2022, M1 Max)', slug: 'mac-studio-2022-m1-max', match: { family: 'Mac Studio', chip: 'M1 Max' } },
    { name: 'Mac Studio (2022, M1 Ultra)', slug: 'mac-studio-2022-m1-ultra', match: { family: 'Mac Studio', chip: 'M1 Ultra' } },
    { name: 'Mac Studio (2023, M2 Max)', slug: 'mac-studio-2023-m2-max', match: { family: 'Mac Studio', chip: 'M2 Max' } },
    { name: 'Mac Studio (2023, M2 Ultra)', slug: 'mac-studio-2023-m2-ultra', match: { family: 'Mac Studio', chip: 'M2 Ultra' } },
    { name: 'Mac Studio (2024, M4 Max)', slug: 'mac-studio-2024-m4-max', match: { family: 'Mac Studio', chip: 'M4 Max' } },
  ],
} satisfies Record<string, Array<{ name: string; slug: string; match: SellMatch }>>;
```

После функции `modelNameFromSlug` добавить:

```ts
/** GST-78: поля сопоставления со строками базы цен по canonical-slug. */
export function modelMatchFromSlug(slug: string): SellMatch | undefined {
  return ALL_BUYOUT_MODELS.find((m) => m.slug === slug)?.match;
}
```

- [ ] **Step 4: Тесты проходят**

Run: `npm test`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/model-slugs.ts tsconfig.json package.json tests/model-slugs.test.ts
git commit -m "feat(gst-78): каталог моделей выкупа с полями сопоставления и тесты node --test"
```

---

### Task 2: Модуль цен страницы модели

**Files:**
- Create: `src/lib/sell-prices.ts`
- Modify: `src/types/avito-prices.ts` — поле `manual_override?: boolean` в `AvitoPriceStat`
- Test: `tests/sell-prices.test.ts`

**Interfaces:**
- Consumes: `SellMatch` из Task 1 (`import type`).
- Produces:
  - `export interface SellConfig { processor: string; ram: number; ssd: number; buyoutPrice: number; medianPrice: number; minPrice: number; maxPrice: number; samplesCount: number; updatedAt: string; manual: boolean; reliable: boolean }`;
  - `export interface SellModelPrices { configs: SellConfig[]; reliable: SellConfig[]; maxBuyout: number; reliableSamples: number; latestUpdate: string | null; sourceModelNames: string[] }`;
  - `MIN_SAMPLES = 5`, `FRESH_DAYS = 30`;
  - `ageDays(updatedAt: string, now: Date): number | null`;
  - `matchRows(stats: AvitoPriceStat[], match: SellMatch): AvitoPriceStat[]`;
  - `buildSellModelPrices(stats: AvitoPriceStat[] | null | undefined, match: SellMatch | undefined, now: Date): SellModelPrices`;
  - `formatRub(n: number): string` (`52 000 ₽` с неразрывными пробелами), `formatStorage(gb: number): string`, `configLabel(c: { ram: number; ssd: number }): string` (`16 ГБ / 1 ТБ`);
  - калькулятор: `ramOptions(configs: SellConfig[]): number[]`, `ssdOptions(configs: SellConfig[], ram: number): number[]`, `findConfig(configs: SellConfig[], ram: number, ssd: number): SellConfig | undefined`.

- [ ] **Step 1: Написать падающий тест**

`tests/sell-prices.test.ts`:

```ts
// GST-78: цены страницы выкупа модели — сопоставление, надёжность, форматы.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchRows, buildSellModelPrices, ageDays, formatRub, configLabel,
  ramOptions, ssdOptions, findConfig,
} from '../src/lib/sell-prices.ts';

const NOW = new Date('2026-09-23T12:00:00');
const row = (name: string, processor: string, ram: number, ssd: number, buyout: number,
             n: number, upd = '2026-09-20 10:00', extra: Record<string, unknown> = {}) => ({
  model_name: name, processor, ram, ssd, buyout_price: buyout,
  median_price: Math.round(buyout / 0.8), min_price: buyout, max_price: buyout,
  samples_count: n, updated_at: upd, ...extra,
});
const PRO14 = { family: 'MacBook Pro', screen: 14, chip: 'M3 Pro' };
const AIR13_M1 = { family: 'MacBook Air', screen: 13, chip: 'M1' };
const MINI_M4 = { family: 'Mac mini', chip: 'M4' };

test('сопоставление: семейство, диагональ и чип; сводки не берутся', () => {
  const stats = [
    row('MacBook Pro 14 (2023)', 'Apple M3 Pro', 18, 512, 120000, 9),
    row('MacBook Pro 14 (2023)', 'Apple M2 Pro', 16, 512, 90000, 9),
    row('MacBook Pro 16 (2023)', 'Apple M3 Pro', 18, 512, 140000, 9),
    row('MacBook Pro 14 (2023)', '', 0, 0, 100000, 141),
  ];
  const got = matchRows(stats, PRO14);
  assert.equal(got.length, 1);
  assert.equal(got[0].processor, 'Apple M3 Pro');
  assert.equal(got[0].model_name, 'MacBook Pro 14 (2023)');
});

test('Air без диагонали не попадает на страницу 13"', () => {
  const stats = [
    row('MacBook Air 13 (2020, M1)', 'Apple M1', 8, 256, 40000, 13),
    row('MacBook Air M1', 'Apple M1', 8, 512, 45000, 16),
  ];
  assert.deepEqual(matchRows(stats, AIR13_M1).map((s) => s.ssd), [256]);
});

test('Mac mini: без диагонали, регистр названия не важен, M4 Pro не смешивается с M4', () => {
  const stats = [
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 34),
    row('mac mini m4', 'Apple M4', 16, 512, 70000, 8),
    row('Mac mini M4 Pro', 'Apple M4 Pro', 24, 512, 120000, 9),
    row('MacBook Air 13 M4', 'Apple M4', 16, 256, 60000, 9),
  ];
  assert.deepEqual(matchRows(stats, MINI_M4).map((s) => s.ssd), [256, 512]);
});

test('Intel: процессор без «Apple»', () => {
  const stats = [row('iMac 27 (2019, Intel)', 'Intel', 8, 1024, 30000, 6)];
  assert.equal(matchRows(stats, { family: 'iMac', screen: 27, chip: 'Intel' }).length, 1);
});

test('надёжность: от 5 объявлений и не старше 30 дней', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 5),
    row('Mac mini M4', 'Apple M4', 16, 512, 70000, 4),
    row('Mac mini M4', 'Apple M4', 24, 512, 90000, 9, '2026-08-01 10:00'),
  ], MINI_M4, NOW);
  assert.deepEqual(p.configs.map((c) => c.reliable), [true, false, false]);
  assert.deepEqual(p.reliable.map((c) => c.ssd), [256]);
});

test('ручная цена надёжна при любой выборке и возрасте', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 1, '2026-01-01 10:00', { manual_override: true }),
  ], MINI_M4, NOW);
  assert.equal(p.reliable.length, 1);
  assert.equal(p.reliable[0].manual, true);
});

test('порядок цен: снимается строка пары с меньшей выборкой', () => {
  const smallerThin = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 60000, 6),
    row('Mac mini M4', 'Apple M4', 16, 512, 55000, 20),
  ], MINI_M4, NOW);
  assert.deepEqual(smallerThin.reliable.map((c) => c.ssd), [512]);

  const biggerThin = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 60000, 20),
    row('Mac mini M4', 'Apple M4', 16, 512, 55000, 6),
  ], MINI_M4, NOW);
  assert.deepEqual(biggerThin.reliable.map((c) => c.ssd), [256]);
});

test('порядок цен: ручная цена не снимается, снимается соседняя', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 60000, 1, '2026-01-01 10:00', { manual_override: true }),
    row('Mac mini M4', 'Apple M4', 16, 512, 55000, 40),
  ], MINI_M4, NOW);
  assert.deepEqual(p.reliable.map((c) => c.ssd), [256]);
});

test('дубль конфигурации — остаётся строка с большей выборкой', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 7),
    row('mac mini m4', 'Apple M4', 16, 256, 44000, 30),
  ], MINI_M4, NOW);
  assert.equal(p.configs.length, 1);
  assert.equal(p.configs[0].buyoutPrice, 44000);
});

test('«до X ₽», выборка и дата — по надёжным', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 10, '2026-09-10 10:00'),
    row('Mac mini M4', 'Apple M4', 16, 512, 70000, 6, '2026-09-21 09:00'),
    row('Mac mini M4', 'Apple M4', 32, 1024, 150000, 2),
  ], MINI_M4, NOW);
  assert.equal(p.maxBuyout, 70000);
  assert.equal(p.reliableSamples, 16);
  assert.equal(p.latestUpdate, '2026-09-21 09:00');
  assert.deepEqual(p.sourceModelNames, ['Mac mini M4']);
});

test('нет данных — пустой результат без падения', () => {
  for (const p of [
    buildSellModelPrices([], MINI_M4, NOW),
    buildSellModelPrices(null, MINI_M4, NOW),
    buildSellModelPrices([row('Mac mini M4', 'Apple M4', 16, 256, 50000, 9)], undefined, NOW),
  ]) {
    assert.deepEqual(p.configs, []);
    assert.equal(p.maxBuyout, 0);
    assert.equal(p.latestUpdate, null);
  }
});

test('возраст: формат базы и старый формат парсера', () => {
  assert.equal(ageDays('2026-09-20 10:00', NOW), 3);
  assert.equal(ageDays('Thu Apr 23 16:02:18 2026', NOW), 152);
  assert.equal(ageDays('вчера', NOW), null);
  assert.equal(ageDays('', NOW), null);
});

test('форматы цены и конфигурации', () => {
  assert.equal(formatRub(52000), '52 000 ₽');
  assert.equal(formatRub(1250000), '1 250 000 ₽');
  assert.equal(configLabel({ ram: 16, ssd: 512 }), '16 ГБ / 512 ГБ');
  assert.equal(configLabel({ ram: 64, ssd: 2048 }), '64 ГБ / 2 ТБ');
});

test('калькулятор: опции памяти и диска, поиск конфигурации', () => {
  const p = buildSellModelPrices([
    row('Mac mini M4', 'Apple M4', 16, 256, 50000, 9),
    row('Mac mini M4', 'Apple M4', 16, 512, 70000, 9),
    row('Mac mini M4', 'Apple M4', 24, 512, 90000, 2),
  ], MINI_M4, NOW);
  assert.deepEqual(ramOptions(p.configs), [16, 24]);
  assert.deepEqual(ssdOptions(p.configs, 16), [256, 512]);
  assert.equal(findConfig(p.configs, 24, 512)?.reliable, false);
  assert.equal(findConfig(p.configs, 8, 256), undefined);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/lib/sell-prices.ts'`.

- [ ] **Step 3: Реализация**

В `src/types/avito-prices.ts` в `AvitoPriceStat` после `updated_at` добавить:

```ts
  manual_override?: boolean; // ручная цена владельца (price-overrides.json) — не «протухает»
```

`src/lib/sell-prices.ts`:

```ts
/**
 * Цены страниц выкупа моделей /sell/<модель> (GST-78, docs/sell-model-pages-GST-78.md).
 *
 * Страница находит свои строки в базе не по названию (названия каталога и базы
 * разные), а по семейству, диагонали и чипу — после GST-77 процессор строки
 * записан с уровнем чипа. Показывать цифру можно только по надёжной
 * конфигурации: иначе клиент получит цену по трём объявлениям полугодовой давности.
 *
 * Чистые функции без рантайм-импортов: тесты (tests/sell-prices.test.ts)
 * запускаются голым `node --test`.
 */
import type { AvitoPriceStat } from '@/types/avito-prices';
import type { SellMatch } from '@/lib/model-slugs';

export const MIN_SAMPLES = 5;
export const FRESH_DAYS = 30;

export interface SellConfig {
  processor: string;
  ram: number;
  ssd: number;
  buyoutPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  samplesCount: number;
  updatedAt: string;
  manual: boolean;
  reliable: boolean;
}

export interface SellModelPrices {
  configs: SellConfig[];        // все конфигурации модели, по памяти и диску
  reliable: SellConfig[];       // только надёжные — таблица и FAQ
  maxBuyout: number;            // «до X ₽»; 0 — надёжных нет
  reliableSamples: number;      // сумма объявлений надёжных строк
  latestUpdate: string | null;  // updated_at самой свежей надёжной строки
  sourceModelNames: string[];   // названия строк базы — для ссылки на /ceny
}

const DAY_MS = 86_400_000;
const NBSP = ' ';

/** Возраст строки в днях. Понимает формат базы и старый формат парсера. */
export function ageDays(updatedAt: string, now: Date): number | null {
  const iso = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(updatedAt || '');
  const t = iso ? Date.parse(`${iso[1]}T${iso[2]}:00`) : Date.parse(updatedAt || '');
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

/** Диагональ из названия строки; null — строка не этого семейства. */
function screenOf(name: string, family: string): number | undefined | null {
  if (!name.toLowerCase().startsWith(family.toLowerCase())) return null;
  const rest = name.slice(family.length);
  if (rest && !/^\s/.test(rest)) return null;
  const m = /^\s+(\d{2})(?!\d)/.exec(rest);
  return m ? Number(m[1]) : undefined;
}

function processorFor(chip: string): string {
  return chip === 'Intel' ? 'Intel' : `Apple ${chip}`;
}

/** Строки базы, относящиеся к модели. Сводки 0/0 — не конфигурации. */
export function matchRows(stats: AvitoPriceStat[], match: SellMatch): AvitoPriceStat[] {
  const processor = processorFor(match.chip);
  return stats.filter((s) => {
    if (!(s.ram > 0 && s.ssd > 0)) return false;
    const screen = screenOf(s.model_name || '', match.family);
    if (screen === null || screen !== match.screen) return false;
    return s.processor === processor;
  });
}

function toConfig(s: AvitoPriceStat): SellConfig {
  return {
    processor: s.processor,
    ram: s.ram,
    ssd: s.ssd,
    buyoutPrice: s.buyout_price,
    medianPrice: s.median_price,
    minPrice: s.min_price,
    maxPrice: s.max_price,
    samplesCount: s.samples_count || 0,
    updatedAt: s.updated_at || '',
    manual: Boolean(s.manual_override),
    reliable: false,
  };
}

/**
 * Конфигурация с большей (или равной) памятью и диском не может стоить меньше.
 * Такая пара противоречит сама себе: снимаем строку с меньшей выборкой —
 * у неё выше шанс оказаться шумом. Ручная цена владельца не снимается.
 */
function dropPriceInversions(configs: SellConfig[]): void {
  for (;;) {
    const rel = configs.filter((c) => c.reliable);
    let loser: SellConfig | null = null;
    for (const a of rel) {
      for (const b of rel) {
        const bigger = b.ram >= a.ram && b.ssd >= a.ssd && (b.ram > a.ram || b.ssd > a.ssd);
        if (!bigger || b.buyoutPrice >= a.buyoutPrice || (a.manual && b.manual)) continue;
        loser = a.manual ? b : b.manual ? a : b.samplesCount < a.samplesCount ? b : a;
        break;
      }
      if (loser) break;
    }
    if (!loser) return;
    loser.reliable = false;
  }
}

export function buildSellModelPrices(
  stats: AvitoPriceStat[] | null | undefined,
  match: SellMatch | undefined,
  now: Date,
): SellModelPrices {
  const byConfig = new Map<string, AvitoPriceStat>();
  if (match) {
    for (const s of matchRows(stats || [], match)) {
      const key = `${s.ram}/${s.ssd}`;
      const prev = byConfig.get(key);
      if (!prev || (s.samples_count || 0) > (prev.samples_count || 0)) byConfig.set(key, s);
    }
  }
  const configs = [...byConfig.values()].map(toConfig).sort((a, b) => a.ram - b.ram || a.ssd - b.ssd);
  for (const c of configs) {
    const age = ageDays(c.updatedAt, now);
    c.reliable = c.manual || (c.samplesCount >= MIN_SAMPLES && age !== null && age <= FRESH_DAYS);
  }
  dropPriceInversions(configs);

  const reliable = configs.filter((c) => c.reliable);
  let latest: SellConfig | null = null;
  for (const c of reliable) {
    const age = ageDays(c.updatedAt, now);
    if (age !== null && (!latest || age < (ageDays(latest.updatedAt, now) ?? Infinity))) latest = c;
  }
  return {
    configs,
    reliable,
    maxBuyout: reliable.reduce((m, c) => Math.max(m, c.buyoutPrice), 0),
    reliableSamples: reliable.reduce((n, c) => n + c.samplesCount, 0),
    latestUpdate: latest ? latest.updatedAt : null,
    sourceModelNames: [...new Set([...byConfig.values()].map((s) => s.model_name))],
  };
}

export function formatRub(n: number): string {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}₽`;
}

export function formatStorage(gb: number): string {
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} ТБ` : `${gb} ГБ`;
}

export function configLabel(c: { ram: number; ssd: number }): string {
  return `${c.ram} ГБ / ${formatStorage(c.ssd)}`;
}

// ─── Калькулятор: процессор на странице один, выбираются память и диск ───────

export function ramOptions(configs: SellConfig[]): number[] {
  return [...new Set(configs.map((c) => c.ram))].sort((a, b) => a - b);
}

export function ssdOptions(configs: SellConfig[], ram: number): number[] {
  return [...new Set(configs.filter((c) => c.ram === ram).map((c) => c.ssd))].sort((a, b) => a - b);
}

export function findConfig(configs: SellConfig[], ram: number, ssd: number): SellConfig | undefined {
  return configs.find((c) => c.ram === ram && c.ssd === ssd);
}
```

- [ ] **Step 4: Тесты проходят**

Run: `npm test`
Expected: `# fail 0`, все тесты `model-slugs` и `sell-prices` проходят.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/sell-prices.ts src/types/avito-prices.ts tests/sell-prices.test.ts
git commit -m "feat(gst-78): цены страницы выкупа по семейству, диагонали и чипу с правилом надёжности"
```

---

### Task 3: FAQ модели и тексты семейств

**Files:**
- Create: `src/data/family-faq.ts`
- Modify: `src/lib/sell-prices.ts` — `FaqItem`, `buildModelFaq`
- Test: `tests/sell-faq.test.ts`

**Interfaces:**
- Consumes: `SellModelPrices`, `formatRub`, `configLabel` из Task 2.
- Produces:
  - `export interface FaqItem { question: string; answer: string }` (в `sell-prices.ts`);
  - `buildModelFaq(shortName: string, prices: SellModelPrices): FaqItem[]`;
  - `FAMILY_FAQ: Record<string, FaqItem[]>` (ключи — `SellMatch.family`) в `src/data/family-faq.ts`.

- [ ] **Step 1: Написать падающий тест**

`tests/sell-faq.test.ts`:

```ts
// GST-78: FAQ страницы выкупа — вопросы из данных модели и тексты семейств.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSellModelPrices, buildModelFaq } from '../src/lib/sell-prices.ts';
import { FAMILY_FAQ } from '../src/data/family-faq.ts';
import { BUYOUT_MODELS } from '../src/lib/model-slugs.ts';

const NOW = new Date('2026-09-23T12:00:00');
const MINI_M4 = { family: 'Mac mini', chip: 'M4' };
const row = (ram: number, ssd: number, buyout: number, n: number) => ({
  model_name: 'Mac mini M4', processor: 'Apple M4', ram, ssd, buyout_price: buyout,
  median_price: buyout, min_price: buyout, max_price: buyout, samples_count: n,
  updated_at: '2026-09-20 10:00',
});

test('с данными: цена, влияние памяти и диска, частая конфигурация', () => {
  const p = buildSellModelPrices([row(16, 256, 50000, 21), row(16, 512, 70000, 6)], MINI_M4, NOW);
  const faq = buildModelFaq('Mac mini M4', p);
  assert.equal(faq.length, 3);
  assert.equal(faq[0].question, 'Сколько стоит выкуп Mac mini M4?');
  assert.equal(faq[0].answer,
    'До 70 000 ₽ за 16 ГБ / 512 ГБ. Цена по 27 объявлениям на Авито за последние 30 дней; точную сумму назовём после осмотра.');
  assert.equal(faq[1].question, 'Как память и диск влияют на цену Mac mini M4?');
  assert.equal(faq[1].answer, '16 ГБ / 256 ГБ — до 50 000 ₽, 16 ГБ / 512 ГБ — до 70 000 ₽.');
  assert.equal(faq[2].question, 'Какая конфигурация Mac mini M4 встречается чаще всего?');
  assert.equal(faq[2].answer,
    '16 ГБ / 256 ГБ — 21 объявление на Авито за последние 30 дней. Её выкупаем до 50 000 ₽.');
});

test('одна надёжная конфигурация — без вопроса о памяти и диске', () => {
  const p = buildSellModelPrices([row(16, 256, 50000, 21)], MINI_M4, NOW);
  const faq = buildModelFaq('Mac mini M4', p);
  assert.deepEqual(faq.map((f) => f.question), [
    'Сколько стоит выкуп Mac mini M4?',
    'Какая конфигурация Mac mini M4 встречается чаще всего?',
  ]);
  assert.ok(faq[0].answer.includes('по 21 объявлению'));
});

test('FAQ без данных — ответ про оценку по фото, без цифр', () => {
  const p = buildSellModelPrices([], MINI_M4, NOW);
  assert.deepEqual(buildModelFaq('Mac mini M4', p), [{
    question: 'Сколько стоит выкуп Mac mini M4?',
    answer: 'Свежих объявлений по этой модели мало, поэтому цену назовём по фото за 15 минут.',
  }]);
});

test('тексты есть у каждого семейства каталога, по три вопроса', () => {
  for (const family of Object.keys(BUYOUT_MODELS)) {
    assert.equal(FAMILY_FAQ[family]?.length, 3, family);
    for (const f of FAMILY_FAQ[family]) assert.ok(f.question.endsWith('?') && f.answer.length > 20, f.question);
  }
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `does not provide an export named 'buildModelFaq'` или `Cannot find module '.../src/data/family-faq.ts'`.

- [ ] **Step 3: Реализация**

В конец `src/lib/sell-prices.ts`:

```ts
// ─── FAQ модели из данных ────────────────────────────────────────────────────
// Раньше у всех 31 страницы был один общий FAQ — Яндекс видел их одинаковыми.
// Вопросы с цифрами модели делают страницу своей и обновляются вместе с ценами.

export interface FaqItem {
  question: string;
  answer: string;
}

function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

/** «по N объявлениям» — дательный падеж. */
function byListings(n: number): string {
  return `по ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'объявлению' : 'объявлениям'}`;
}

export function buildModelFaq(shortName: string, prices: SellModelPrices): FaqItem[] {
  const priceQuestion = `Сколько стоит выкуп ${shortName}?`;
  if (!prices.reliable.length) {
    return [{
      question: priceQuestion,
      answer: 'Свежих объявлений по этой модели мало, поэтому цену назовём по фото за 15 минут.',
    }];
  }
  const rel = prices.reliable;
  const top = rel.reduce((a, b) => (b.buyoutPrice > a.buyoutPrice ? b : a));
  const cheap = rel.reduce((a, b) => (b.buyoutPrice < a.buyoutPrice ? b : a));
  const common = rel.reduce((a, b) => (b.samplesCount > a.samplesCount ? b : a));

  const faq: FaqItem[] = [{
    question: priceQuestion,
    answer: `До ${formatRub(top.buyoutPrice)} за ${configLabel(top)}. Цена ${byListings(prices.reliableSamples)} ` +
      'на Авито за последние 30 дней; точную сумму назовём после осмотра.',
  }];
  if (rel.length >= 2) {
    faq.push({
      question: `Как память и диск влияют на цену ${shortName}?`,
      answer: `${configLabel(cheap)} — до ${formatRub(cheap.buyoutPrice)}, ${configLabel(top)} — до ${formatRub(top.buyoutPrice)}.`,
    });
  }
  faq.push({
    question: `Какая конфигурация ${shortName} встречается чаще всего?`,
    answer: `${configLabel(common)} — ${common.samplesCount} ` +
      `${plural(common.samplesCount, 'объявление', 'объявления', 'объявлений')} на Авито за последние 30 дней. ` +
      `Её выкупаем до ${formatRub(common.buyoutPrice)}.`,
  });
  return faq;
}
```

`src/data/family-faq.ts`:

```ts
/**
 * Вопросы семейства на страницах выкупа моделей (GST-78). Тексты согласованы
 * с владельцем в спеке docs/sell-model-pages-GST-78.md, раздел 4.
 * Ключ — SellMatch.family. Без рантайм-импортов: файл читает `node --test`.
 */
import type { FaqItem } from '@/lib/sell-prices';

export const FAMILY_FAQ: Record<string, FaqItem[]> = {
  'MacBook Air': [
    {
      question: 'Что вы проверяете при выкупе MacBook Air?',
      answer: 'Корпус и экран, клавиатуру и трекпад, порты и зарядку, состояние и число циклов аккумулятора, отвязку от iCloud. Осмотр занимает 10–15 минут.',
    },
    {
      question: 'Сильно ли снижает цену износ аккумулятора?',
      answer: 'Ёмкость ниже 80% или сервисное предупреждение снижают цену: замену батареи мы закладываем в оценку. Число циклов само по себе цену почти не меняет.',
    },
    {
      question: 'Выкупаете ли MacBook Air с повреждённым экраном?',
      answer: 'Да. Цена зависит от повреждения: полосы, пятна или трещина — назовём сумму по фото.',
    },
  ],
  'MacBook Pro': [
    {
      question: 'Что вы проверяете при выкупе MacBook Pro?',
      answer: 'Экран (у 14 и 16 дюймов — равномерность подсветки), клавиатуру, порты, аккумулятор, работу под нагрузкой и отвязку от iCloud.',
    },
    {
      question: 'Почему у одной модели MacBook Pro такой разброс цен?',
      answer: 'Цена зависит от чипа (обычный, Pro или Max), объёма памяти и диска. Поэтому в таблице цены указаны по конфигурациям.',
    },
    {
      question: 'Выкупаете ли MacBook Pro с дефектами?',
      answer: 'Да: с повреждённым экраном, залитые, с неисправной клавиатурой. Сумму назовём по фото.',
    },
  ],
  'iMac': [
    {
      question: 'Как продать iMac, если его неудобно везти?',
      answer: 'Приедем сами: осмотр и расчёт на месте, по Москве бесплатно.',
    },
    {
      question: 'Что вы проверяете при выкупе iMac?',
      answer: 'Экран на пятна и засветы, порты, камеру и звук, отвязку от iCloud. Комплектность (клавиатура, мышь, кабель питания) влияет на цену.',
    },
    {
      question: 'Выкупаете ли iMac на Intel?',
      answer: 'Да, цену назовём по фото и серийному номеру: свежих объявлений на Авито по ним мало.',
    },
  ],
  'Mac mini': [
    {
      question: 'Что вы проверяете при выкупе Mac mini?',
      answer: 'Порты, работу под нагрузкой, диск и отвязку от iCloud. Корпус проверяем на следы вскрытия.',
    },
    {
      question: 'Нужны ли коробка и кабель?',
      answer: 'Нет, но с коробкой цена немного выше.',
    },
    {
      question: 'Сколько стоит Mac mini на M4 Pro и M2 Pro?',
      answer: 'Версии с Pro-чипом стоят заметно дороже базовых. Цены по конфигурациям — в таблице выше или по фото.',
    },
  ],
  'Mac Studio': [
    {
      question: 'Выкупаете ли Mac Studio?',
      answer: 'Да, все поколения: M1 Max/Ultra, M2 Max/Ultra, M4 Max. Сделки крупные, поэтому приедем и проверим на месте.',
    },
    {
      question: 'Почему по Mac Studio цены часто «по фото»?',
      answer: 'На Авито мало объявлений по каждой конфигурации, а цена сильно зависит от памяти и диска. Точную сумму назовём после фото конфигурации из «Об этом Mac».',
    },
    {
      question: 'Как проходит оплата за дорогую технику?',
      answer: 'Переводом на карту или наличными после осмотра, с договором купли-продажи.',
    },
  ],
};
```

- [ ] **Step 4: Тесты проходят**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/sell-prices.ts src/data/family-faq.ts tests/sell-faq.test.ts
git commit -m "feat(gst-78): FAQ модели из данных и тексты семейств"
```

---

### Task 4: Серверная страница — блок цен и FAQ

**Files:**
- Create: `src/components/sell/SellPriceBlock.tsx` (серверный компонент)
- Modify: `app/sell/[model_slug]/page.tsx`
- Modify: `src/lib/schema.ts` — удалить `faqData.sell` (больше нигде не используется)

**Interfaces:**
- Consumes: `modelMatchFromSlug` (Task 1); `buildSellModelPrices`, `buildModelFaq`, `configLabel`, `formatRub`, `SellModelPrices`, `FaqItem` (Tasks 2–3); `FAMILY_FAQ` (Task 3); `loadAvitoPricesServer` (`src/lib/server-prices.ts`); `getPriceModelSlugs` (`src/lib/price-pages.ts`); `modelToSlug` (`src/lib/model-slugs.ts`).
- Produces: пропсы для Task 5 — `<SellModel modelName slug configs={prices.configs} totalListings updatedLabel />`, где `configs: SellConfig[]`, `totalListings: number`, `updatedLabel: string` (пустая строка, если даты нет).

- [ ] **Step 1: Компонент блока цен**

`src/components/sell/SellPriceBlock.tsx`:

```tsx
import Link from 'next/link';
import { configLabel, formatRub, type SellModelPrices } from '@/lib/sell-prices';

const TELEGRAM_URL = 'https://t.me/romanmanro';

interface Props {
  shortName: string;
  prices: SellModelPrices;
  updatedLabel: string;
  cenyHref: string;
}

/**
 * GST-78: цены модели в серверном HTML. Калькулятор выше — клиентский, и
 * поисковик раньше видел страницу выкупа без единой цифры.
 */
export default function SellPriceBlock({ shortName, prices, updatedLabel, cenyHref }: Props) {
  const has = prices.reliable.length > 0;
  return (
    <section className="container mx-auto px-4 pb-12" id="ceny-vykupa">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Цены выкупа {shortName}{has ? ` — до ${formatRub(prices.maxBuyout)}` : ''}
        </h2>
        {has ? (
          <>
            <p className="text-center text-muted-foreground mb-6">
              По {prices.reliableSamples} объявлениям на Авито за последние 30 дней
              {updatedLabel ? `, обновлено ${updatedLabel}` : ''}
            </p>
            <table className="w-full border border-border/60 rounded-xl overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold">Конфигурация</th>
                  <th className="text-right p-3 font-semibold">Выкуп</th>
                </tr>
              </thead>
              <tbody>
                {prices.reliable.map((c) => (
                  <tr key={`${c.ram}/${c.ssd}`} className="border-t border-border/60">
                    <td className="p-3">{configLabel(c)}</td>
                    <td className="p-3 text-right font-medium">до {formatRub(c.buyoutPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-center text-muted-foreground mb-4">
            Свежих данных по этой модели мало — назовём цену по фото за 15 минут.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Отправить фото в Telegram
          </a>
          <Link href={cenyHref} className="text-primary underline">
            Рыночные цены на Авито
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Страница**

`app/sell/[model_slug]/page.tsx` — импорты заменить на:

```tsx
import type { Metadata } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import {
  slugToModelName,
  modelShortName,
  modelNameFromSlug,
  modelMatchFromSlug,
  modelToSlug,
  ALL_BUYOUT_MODELS,
} from '@/lib/model-slugs';
import { generateBreadcrumbSchema } from '@/lib/structured-data';
import { loadAvitoPricesServer } from '@/lib/server-prices';
import { getPriceModelSlugs } from '@/lib/price-pages';
import { buildSellModelPrices, buildModelFaq, ageDays } from '@/lib/sell-prices';
import { FAMILY_FAQ } from '@/data/family-faq';
import SellModel from '@/views/SellModel';
import SellPriceBlock from '@/components/sell/SellPriceBlock';
```

В `SellModelPage` заменить всё от `const shortName = modelShortName(modelName);` до конца функции на:

```tsx
  const shortName = modelShortName(modelName);

  // GST-78: цены модели по семейству, диагонали и чипу (не по названию).
  const match = modelMatchFromSlug(model_slug);
  const data = await loadAvitoPricesServer();
  const now = new Date();
  const prices = buildSellModelPrices(data?.stats, match, now);
  const updatedLabel = prices.latestUpdate && ageDays(prices.latestUpdate, now) !== null
    ? formatUpdated(prices.latestUpdate)
    : '';

  // Рыночные цены: страница /ceny той же модели, если строки лежат под одним
  // названием и такая страница есть; иначе общий индекс.
  const cenySlugs = await getPriceModelSlugs();
  const onlyName = prices.sourceModelNames.length === 1 ? modelToSlug(prices.sourceModelNames[0]) : '';
  const cenyHref = onlyName && cenySlugs.includes(onlyName) ? `/ceny/${onlyName}` : '/ceny';

  const faqs = [...buildModelFaq(shortName, prices), ...(match ? FAMILY_FAQ[match.family] ?? [] : [])];

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Главная', url: '/' },
    { name: 'Выкуп', url: '/sell' },
    { name: shortName, url: `/sell/${model_slug}` },
  ]);
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [breadcrumbSchema, faqSchema] }),
        }}
      />

      {/* Интерактивный калькулятор — клиентский островок; конфигурации приходят с сервера. */}
      <SellModel
        modelName={modelName}
        slug={model_slug}
        configs={prices.configs}
        totalListings={data?.total_listings ?? 0}
        updatedLabel={updatedLabel}
      />

      <SellPriceBlock shortName={shortName} prices={prices} updatedLabel={updatedLabel} cenyHref={cenyHref} />

      {/* Серверный FAQ: вопросы модели из данных + блок семейства (GST-78). */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Частые вопросы о выкупе {shortName}
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/** «2026-09-21 09:00» → «21 сентября 2026». Старый формат парсера — через Date. */
function formatUpdated(updatedAt: string): string {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(updatedAt);
  const d = new Date(iso ? `${iso[1]}T12:00:00` : updatedAt);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
```

В `src/lib/schema.ts` удалить из `faqData` ключ `sell: [ ... ],` целиком (шесть вопросов от «Как быстро вы оцениваете технику?» до «Выкупаете ли технику с блокировкой iCloud?»). Перед удалением убедиться, что других использований нет:

```bash
grep -rn "faqData.sell\|faqData\[.sell.\]" src app
```

Expected: только `app/sell/[model_slug]/page.tsx` (уже убрано на этом шаге) — после правки вывод пустой.

- [ ] **Step 3: Проверка**

Тестов для страницы нет (Next-страница, проверяется сборкой в Task 6). Здесь — тесты модулей и отсутствие старых ссылок:

Run: `npm test && grep -rn "faqData.sell" src app; echo grep-exit=$?`
Expected: `# fail 0`, затем `grep-exit=1` (совпадений нет).

- [ ] **Step 4: Коммит**

Коммит вместе с Task 5: страница передаёт калькулятору новые пропсы, и по отдельности сборка не пройдёт проверку типов. Переходить к Task 5.

---

### Task 5: Калькулятор на серверных конфигурациях

**Files:**
- Modify: `src/views/SellModel.tsx` — целиком

**Interfaces:**
- Consumes: `SellConfig`, `ramOptions`, `ssdOptions`, `findConfig` (Task 2); пропсы из Task 4: `configs: SellConfig[]`, `totalListings: number`, `updatedLabel: string`; существующие `calculateBuyoutPrice`, `formatPrice`, `formatSsd` (`src/lib/avito-prices.ts`), `LeadForm` (`src/components/LeadForm.tsx`, пропсы `title`, `subtitle`, `formType`).
- Produces: компонент `SellModel` с пропсами `{ modelName: string; slug: string; configs: SellConfig[]; totalListings: number; updatedLabel: string }`.

- [ ] **Step 1: Переписать компонент**

`src/views/SellModel.tsx` целиком:

```tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { calculateBuyoutPrice, formatSsd, formatPrice } from '@/lib/avito-prices';
import type { AvitoPriceStat, ConditionValue } from '@/types/avito-prices';
import { CONDITIONS } from '@/types/avito-prices';
import { ramOptions, ssdOptions, findConfig, type SellConfig } from '@/lib/sell-prices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeadForm from '@/components/LeadForm';
import { Clock, Wallet, TrendingUp, Shield, BarChart3, Cpu, HardDrive, MemoryStick, Sparkles, Check, Camera } from 'lucide-react';
import { modelShortName, POPULAR_MODELS } from '@/lib/model-slugs';
import Link from "next/link";

const TELEGRAM_URL = 'https://t.me/romanmanro';

interface SellModelProps {
  /** Название модели из каталога, отрезолвленное на сервере по slug. */
  modelName: string;
  slug: string;
  /**
   * GST-78: конфигурации модели с сервера (src/lib/sell-prices.ts). Раньше
   * калькулятор искал модель в avito-urls.json по точному названию и на 22
   * страницах из 31 не находил ничего.
   */
  configs: SellConfig[];
  totalListings: number;
  updatedLabel: string;
}

type Result =
  | { kind: 'price'; marketMin: number; marketMax: number; marketMedian: number; buyoutPrice: number; samplesCount: number }
  | { kind: 'photo' };

/** calculateBuyoutPrice работает со строкой базы — собираем её из конфигурации. */
function toStat(c: SellConfig): AvitoPriceStat {
  return {
    model_name: '', processor: c.processor, ram: c.ram, ssd: c.ssd,
    median_price: c.medianPrice, min_price: c.minPrice, max_price: c.maxPrice,
    buyout_price: c.buyoutPrice, samples_count: c.samplesCount, updated_at: c.updatedAt,
  };
}

const SellModel = ({ modelName, slug, configs, totalListings, updatedLabel }: SellModelProps) => {
  const [ram, setRam] = useState<number | ''>('');
  const [ssd, setSsd] = useState<number | ''>('');
  const [condition, setCondition] = useState<ConditionValue>('excellent');
  const [result, setResult] = useState<Result | null>(null);

  const shortName = modelShortName(modelName);
  const processor = configs[0]?.processor ?? '';
  const noData = configs.length === 0;
  const ramList = useMemo(() => ramOptions(configs), [configs]);
  const ssdList = useMemo(() => (ram ? ssdOptions(configs, Number(ram)) : []), [configs, ram]);

  useEffect(() => { setSsd(''); setResult(null); }, [ram]);
  useEffect(() => { setResult(null); }, [ssd, condition]);

  const handleCalculate = () => {
    if (!ram || !ssd) return;
    const cfg = findConfig(configs, Number(ram), Number(ssd));
    // GST-78: сумму показываем только по надёжной конфигурации — иначе оценка по фото.
    if (!cfg || !cfg.reliable) {
      setResult({ kind: 'photo' });
      return;
    }
    const r = calculateBuyoutPrice(toStat(cfg), condition);
    setResult({
      kind: 'price', marketMin: r.marketMin, marketMax: r.marketMax, marketMedian: r.marketMedian,
      buyoutPrice: r.buyoutPrice, samplesCount: r.samplesCount,
    });
  };

  const showPhoto = noData || result?.kind === 'photo';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Выкуп', url: '/sell' },
          { name: shortName, url: `/sell/${slug}` },
        ]} />

        <div className="max-w-5xl mx-auto">
          {/* Hero — стартуем видимым (opacity:1), чтобы H1 был в HTML и не зависел от JS */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Выкуп {shortName} в Москве
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Узнайте реальную рыночную стоимость вашего {shortName} прямо сейчас.
              Оценка на основе анализа {totalListings > 0 ? totalListings.toLocaleString('ru-RU') : '800+'} объявлений.
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <Clock className="w-4 h-4 text-primary" />
                <span>10 секунд</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Реальные цены рынка</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Деньги в день обращения</span>
              </div>
            </div>
          </motion.div>

          {/* Калькулятор */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Параметры {shortName}
                  </CardTitle>
                  <CardDescription>Выберите конфигурацию вашего устройства</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                      Модель
                    </label>
                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{modelName}</span>
                    </div>
                  </div>

                  {processor && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                        <Cpu className="w-4 h-4" /> Процессор
                      </label>
                      <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{processor}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                      <MemoryStick className="w-4 h-4" /> Оперативная память
                    </label>
                    <Select value={ram ? String(ram) : ''} onValueChange={(v) => setRam(Number(v))} disabled={noData}>
                      <SelectTrigger><SelectValue placeholder={noData ? 'Оценим по фото' : 'Выберите RAM'} /></SelectTrigger>
                      <SelectContent>{ramList.map((r) => <SelectItem key={r} value={String(r)}>{r} GB</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
                      <HardDrive className="w-4 h-4" /> Накопитель SSD
                    </label>
                    <Select value={ssd ? String(ssd) : ''} onValueChange={(v) => setSsd(Number(v))} disabled={!ram || ssdList.length === 0}>
                      <SelectTrigger><SelectValue placeholder="Выберите SSD" /></SelectTrigger>
                      <SelectContent>{ssdList.map((s) => <SelectItem key={s} value={String(s)}>{formatSsd(s)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">5</span>
                      <Shield className="w-4 h-4" /> Состояние
                    </label>
                    <Select value={condition} onValueChange={(v) => setCondition(v as ConditionValue)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex flex-col">
                              <span>{c.label}</span>
                              <span className="text-xs text-muted-foreground">{c.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleCalculate} className="w-full" size="lg" disabled={!ram || !ssd}>
                    <TrendingUp className="w-4 h-4 mr-2" /> Узнать стоимость
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Рыночная стоимость</CardTitle>
                  <CardDescription>{updatedLabel && `Данные обновлены: ${updatedLabel}`}</CardDescription>
                </CardHeader>
                <CardContent>
                  {showPhoto ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                      <div className="text-center p-6 bg-primary/5 rounded-xl border-2 border-primary/20">
                        <Camera className="w-10 h-10 mx-auto mb-3 text-primary" />
                        <p className="text-2xl font-bold mb-2">Точную цену назовём по фото за 15 минут</p>
                        <p className="text-muted-foreground">
                          По этой конфигурации мало свежих объявлений — не будем гадать с суммой.
                        </p>
                      </div>
                      <Button variant="default" size="lg" className="w-full" asChild>
                        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                          <Wallet className="w-4 h-4 mr-2" /> Отправить фото в Telegram
                        </a>
                      </Button>
                      <Button variant="outline" size="lg" className="w-full" asChild>
                        <a href="#zayavka">Оставить заявку</a>
                      </Button>
                    </motion.div>
                  ) : !result ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mb-4 opacity-30" />
                      <p>Заполните параметры устройства</p>
                      <p className="text-sm">и нажмите «Узнать стоимость»</p>
                    </div>
                  ) : result.kind === 'price' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium">{modelName}</p>
                        <p className="text-sm text-muted-foreground">{processor} / {ram} GB RAM / {formatSsd(Number(ssd))}</p>
                      </div>
                      <div className="text-center p-6 bg-muted/30 rounded-xl border">
                        <p className="text-sm text-muted-foreground mb-2">Рыночная цена сейчас</p>
                        <p className="text-3xl md:text-4xl font-bold">{formatPrice(result.marketMin)} – {formatPrice(result.marketMax)}</p>
                        <p className="text-sm text-muted-foreground mt-2">Медиана: {formatPrice(result.marketMedian)}</p>
                      </div>
                      <div className="text-center p-6 bg-primary/5 rounded-xl border-2 border-primary/20">
                        <p className="text-sm font-medium text-primary mb-2">💰 Рекомендуемая цена выкупа</p>
                        <p className="text-4xl md:text-5xl font-bold text-primary">≈ {formatPrice(result.buyoutPrice)}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <BarChart3 className="w-4 h-4" />
                        <span>На основе {result.samplesCount} объявлений за последние 30 дней</span>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg text-xs text-muted-foreground">
                        <p>⚠️ Оценка на основе анализа открытого рынка. Итоговая цена может отличаться в зависимости от комплектации, циклов батареи и состояния устройства.</p>
                      </div>
                      <Button variant="default" size="lg" className="w-full" asChild>
                        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                          <Wallet className="w-4 h-4 mr-2" /> Продать сейчас
                        </a>
                      </Button>
                    </motion.div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Форма заявки — для оценки по фото, когда суммы нет (GST-78) */}
          {showPhoto && (
            <div id="zayavka" className="mb-16">
              <LeadForm
                formType="sell"
                title={`Оценка ${shortName} по фото`}
                subtitle="Пришлите фото и конфигурацию — назовём цену за 15 минут"
              />
            </div>
          )}

          {/* Другие модели */}
          <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <h2 className="text-2xl font-bold text-center mb-8">Выкуп других моделей MacBook</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {POPULAR_MODELS.filter(m => m.slug !== slug).map(m => (
                <Link key={m.slug} href={`/sell/${m.slug}`} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors">
                  {modelShortName(m.name)}
                </Link>
              ))}
            </div>
          </motion.section>

          {/* Как это работает */}
          <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <h2 className="text-2xl font-bold text-center mb-8">Как мы рассчитываем цену</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"><BarChart3 className="w-5 h-5 text-primary" /></div>
                  <CardTitle className="text-lg">Анализ рынка</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground text-sm">Каждый день мы анализируем сотни объявлений о продаже MacBook на открытом рынке.</p></CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"><TrendingUp className="w-5 h-5 text-primary" /></div>
                  <CardTitle className="text-lg">Умная фильтрация</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground text-sm">Отсеиваем завышенные и заниженные цены, оставляя только актуальные предложения.</p></CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"><Shield className="w-5 h-5 text-primary" /></div>
                  <CardTitle className="text-lg">Честная оценка</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground text-sm">Цена выкупа учитывает состояние устройства и включает нашу комиссию за быструю сделку.</p></CardContent>
              </Card>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default SellModel;
```

- [ ] **Step 2: Проверка типов в чистой копии**

На Рабочем столе `tsc` ломают копии iCloud в `node_modules`, поэтому — в чистой копии (та же процедура, что в Task 6, Step 1, но только проверка типов):

```bash
W=/private/tmp/claude-501/-Users-a1111-Desktop-bestmac-avito-apple/2db040c6-328f-47e3-a8a6-55908b14d68c/scratchpad/build-gst78
rm -rf "$W" && mkdir -p "$W"
git ls-files -z --cached --others --exclude-standard | grep -zv ' 2\.\| 2/' | rsync -a --from0 --files-from=- ./ "$W/"
find "$W/src" -depth -type d -empty -delete
cd "$W" && npm ci --no-audit --no-fund --loglevel=error && npx tsc --noEmit -p . 2>&1 | grep -E "sell|SellModel|model-slugs|family-faq|schema\.ts" ; echo tsc-done
```

Expected: ни одной ошибки в файлах GST-78 (строки `tsc-done` без предшествующих ошибок по этим файлам). Ошибки в чужих файлах, существовавшие до ветки, не блокируют — сверить с `git stash`-версией при сомнении.

- [ ] **Step 3: Коммит (Task 4 + Task 5)**

```bash
git add src/components/sell/SellPriceBlock.tsx "app/sell/[model_slug]/page.tsx" src/lib/schema.ts src/views/SellModel.tsx
git commit -m "feat(gst-78): цены и FAQ модели в серверном HTML, калькулятор на конфигурациях с сервера"
```

---

### Task 6: Сборка, проверка страниц и выкатка

**Files:** без изменений кода.

**Interfaces:**
- Consumes: всё из Tasks 1–5.

- [ ] **Step 1: Сборка в чистой копии**

```bash
W=/private/tmp/claude-501/-Users-a1111-Desktop-bestmac-avito-apple/2db040c6-328f-47e3-a8a6-55908b14d68c/scratchpad/build-gst78
rm -rf "$W" && mkdir -p "$W"
git ls-files -z --cached --others --exclude-standard | grep -zv ' 2\.\| 2/' | rsync -a --from0 --files-from=- ./ "$W/"
find "$W/src" -depth -type d -empty -delete
cd "$W" && npm ci --no-audit --no-fund --loglevel=error && npm test && NEXT_TELEMETRY_DISABLED=1 npx next build > build.log 2>&1; echo build=$?; tail -5 build.log
```

Expected: `# fail 0`, `build=0`.

- [ ] **Step 2: Проверка всех 31 страницы**

```bash
cd "$W" && (npx next start -p 3920 > start.log 2>&1 &) ; for i in $(seq 1 30); do curl -s -o /dev/null localhost:3920/ && break; sleep 1; done
python3 - <<'PY'
import json, re, urllib.request
src = open('src/lib/model-slugs.ts', encoding='utf-8').read()
slugs = re.findall(r"slug: '([a-z0-9-]+)', match", src)
assert len(slugs) == 31, len(slugs)
bad = []
with_table = 0
for s in slugs:
    html = urllib.request.urlopen(f'http://localhost:3920/sell/{s}').read().decode()
    has_table = 'Конфигурация</th>' in html
    has_photo = 'Свежих данных по этой модели мало' in html
    with_table += has_table
    faq_ok = 'Сколько стоит выкуп' in html
    ld = [json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html)]
    faqpage = [n for d in ld for n in d.get('@graph', [d]) if n.get('@type') == 'FAQPage']
    ld_ok = bool(faqpage) and len(faqpage[0]['mainEntity']) >= 4
    if not ((has_table or has_photo) and faq_ok and ld_ok):
        bad.append((s, has_table, has_photo, faq_ok, ld_ok))
print('страниц с таблицей:', with_table, '/ 31')
print('ошибки:', bad or 'нет')
PY
pkill -f "next start -p 3920"
```

Expected: `ошибки: нет`; страниц с таблицей — около 21 (по живой базе на 23.09: у 10 моделей надёжных конфигураций нет).

- [ ] **Step 3: Калькулятор там, где было «Нет данных»**

Поднять `npx next start -p 3920` в `$W` и открыть в браузере `http://localhost:3920/sell/mac-mini-2024-m4` и `http://localhost:3920/sell/macbook-pro-14-2023-m3-pro`: в списке памяти есть варианты; надёжная конфигурация даёт «≈ X ₽», ненадёжная — «Точную цену назовём по фото за 15 минут», Telegram и форму заявки. На `/sell/imac-27-2019-intel` — сразу блок «по фото». Если браузера нет — проверить, что конфигурации попали в RSC-данные страницы:

```bash
curl -s localhost:3920/sell/mac-mini-2024-m4 | grep -o '\\"buyoutPrice\\":[0-9]*' | head -3
```

Expected: несколько строк `"buyoutPrice":<число>`.

- [ ] **Step 4: Все проверки проекта**

```bash
npm test
for t in scripts/common/test_price_identity.py scripts/price-sync/test_normalize.py scripts/avito-parser/test_parser.py; do python3 "$t" >/dev/null 2>&1 && echo "ok $t" || echo "FAIL $t"; done
```

Expected: `# fail 0`; три `ok` (Python-часть не менялась — контроль, что ничего не задето).

- [ ] **Step 5: PR**

```bash
git push -u origin feat/gst-78-sell-model-pages
gh pr create --base main --title "GST-78: цены и FAQ на страницах выкупа моделей" --body-file <файл с описанием>
```

Описание: что сделано (4 пункта из спеки), числа из Step 2 (страниц с таблицей, 0 ошибок), что калькулятор больше не пишет «Нет данных» на 22 страницах. Мерж — только после «влей» владельца.

- [ ] **Step 6: После мержа**

Дождаться деплоя (страница `/sell/mac-mini-2024-m4` на bestmac.ru содержит `Цены выкупа`), прогнать Step 2 против `https://bestmac.ru`, затем отправить на переобход в Яндекс.Вебмастере (`add-recrawl-url`) страницы из Step 2, у которых появилась таблица, — в пределах дневной квоты (`get-recrawl-quota`).
