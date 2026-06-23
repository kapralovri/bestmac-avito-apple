/**
 * Утилиты для генерации и парсинга слогов моделей Apple
 * Пример: "MacBook Air 13 (2020, M1)" → "macbook-air-13-2020-m1"
 */

export function modelToSlug(modelName: string): string {
  return modelName
    .toLowerCase()
    .replace(/[(),]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function slugToModelName(slug: string, availableModels: string[]): string | undefined {
  return availableModels.find(m => modelToSlug(m) === slug);
}

/** Все модели для выкупа, сгруппированные по семейству */
export const BUYOUT_MODELS = {
  'MacBook Air': [
    { name: 'MacBook Air 13 (2020, M1)', slug: 'macbook-air-13-2020-m1' },
    { name: 'MacBook Air 13 (2022, M2)', slug: 'macbook-air-13-2022-m2' },
    { name: 'MacBook Air 13 (2024, M3)', slug: 'macbook-air-13-2024-m3' },
    { name: 'MacBook Air 13 (2025, M4)', slug: 'macbook-air-13-2025-m4' },
    { name: 'MacBook Air 15 (2023, M2)', slug: 'macbook-air-15-2023-m2' },
    { name: 'MacBook Air 15 (2024, M3)', slug: 'macbook-air-15-2024-m3' },
    { name: 'MacBook Air 15 (2025, M4)', slug: 'macbook-air-15-2025-m4' },
  ],
  'MacBook Pro': [
    { name: 'MacBook Pro 13 (2020, M1)', slug: 'macbook-pro-13-2020-m1' },
    { name: 'MacBook Pro 13 (2022, M2)', slug: 'macbook-pro-13-2022-m2' },
    { name: 'MacBook Pro 14 (2021, M1 Pro)', slug: 'macbook-pro-14-2021-m1-pro' },
    { name: 'MacBook Pro 14 (2023, M3 Pro)', slug: 'macbook-pro-14-2023-m3-pro' },
    { name: 'MacBook Pro 14 (2024, M4 Pro)', slug: 'macbook-pro-14-2024-m4-pro' },
    { name: 'MacBook Pro 16 (2021, M1 Pro)', slug: 'macbook-pro-16-2021-m1-pro' },
    { name: 'MacBook Pro 16 (2023, M3 Pro)', slug: 'macbook-pro-16-2023-m3-pro' },
    { name: 'MacBook Pro 16 (2024, M4 Pro)', slug: 'macbook-pro-16-2024-m4-pro' },
  ],
  'iMac': [
    { name: 'iMac 27 (2017, Intel)', slug: 'imac-27-2017-intel' },
    { name: 'iMac 27 (2019, Intel)', slug: 'imac-27-2019-intel' },
    { name: 'iMac 27 (2020, Intel)', slug: 'imac-27-2020-intel' },
    { name: 'iMac 24 (2021, M1)', slug: 'imac-24-2021-m1' },
    { name: 'iMac 24 (2023, M3)', slug: 'imac-24-2023-m3' },
    { name: 'iMac 24 (2024, M4)', slug: 'imac-24-2024-m4' },
  ],
  'Mac mini': [
    { name: 'Mac mini (2020, M1)', slug: 'mac-mini-2020-m1' },
    { name: 'Mac mini (2023, M2)', slug: 'mac-mini-2023-m2' },
    { name: 'Mac mini (2023, M2 Pro)', slug: 'mac-mini-2023-m2-pro' },
    { name: 'Mac mini (2024, M4)', slug: 'mac-mini-2024-m4' },
    { name: 'Mac mini (2024, M4 Pro)', slug: 'mac-mini-2024-m4-pro' },
  ],
  'Mac Studio': [
    { name: 'Mac Studio (2022, M1 Max)', slug: 'mac-studio-2022-m1-max' },
    { name: 'Mac Studio (2022, M1 Ultra)', slug: 'mac-studio-2022-m1-ultra' },
    { name: 'Mac Studio (2023, M2 Max)', slug: 'mac-studio-2023-m2-max' },
    { name: 'Mac Studio (2023, M2 Ultra)', slug: 'mac-studio-2023-m2-ultra' },
    { name: 'Mac Studio (2024, M4 Max)', slug: 'mac-studio-2024-m4-max' },
  ],
};

/** Плоский список популярных моделей (для футера и обратной совместимости) */
export const POPULAR_MODELS = [
  ...BUYOUT_MODELS['MacBook Air'].slice(0, 4),
  ...BUYOUT_MODELS['MacBook Pro'].slice(0, 4),
  { name: 'iMac 24 (2024, M4)', slug: 'imac-24-2024-m4' },
  { name: 'Mac mini (2024, M4)', slug: 'mac-mini-2024-m4' },
  { name: 'Mac Studio (2024, M4 Max)', slug: 'mac-studio-2024-m4-max' },
];

/**
 * Полный плоский каталог моделей выкупа — единственный источник истины для
 * canonical-слогов: используется в sitemap, generateStaticParams и при
 * серверном резолве названия по slug. Sitemap == маршрут == canonical.
 */
export const ALL_BUYOUT_MODELS = Object.values(BUYOUT_MODELS).flat();

/** Название модели по canonical-slug из каталога (без обращения к файлам). */
export function modelNameFromSlug(slug: string): string | undefined {
  return ALL_BUYOUT_MODELS.find((m) => m.slug === slug)?.name;
}

/** Короткое название для SEO (без скобок) */
export function modelShortName(modelName: string): string {
  // "MacBook Air 13 (2020, M1)" → "MacBook Air 13 M1 2020"
  const match = modelName.match(/^(.+?)\s*\((\d{4}),?\s*(.+?)\)$/);
  if (match) {
    return `${match[1]} ${match[3]}`;
  }
  return modelName;
}
