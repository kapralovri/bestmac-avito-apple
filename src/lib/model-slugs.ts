/**
 * Утилиты для генерации и парсинга слогов моделей MacBook
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

/** Популярные модели для футера (ручной список топовых) */
export const POPULAR_MODELS = [
  { name: 'MacBook Air 13 (2020, M1)', slug: 'macbook-air-13-2020-m1' },
  { name: 'MacBook Air 13 (2022, M2)', slug: 'macbook-air-13-2022-m2' },
  { name: 'MacBook Air 13 (2024, M3)', slug: 'macbook-air-13-2024-m3' },
  { name: 'MacBook Air 13 (2025, M4)', slug: 'macbook-air-13-2025-m4' },
  { name: 'MacBook Air 15 (2024, M3)', slug: 'macbook-air-15-2024-m3' },
  { name: 'MacBook Pro 14 (2023, M3 Pro)', slug: 'macbook-pro-14-2023-m3-pro' },
  { name: 'MacBook Pro 14 (2024, M4 Pro)', slug: 'macbook-pro-14-2024-m4-pro' },
  { name: 'MacBook Pro 16 (2023, M3 Pro)', slug: 'macbook-pro-16-2023-m3-pro' },
  { name: 'MacBook Pro 13 (2020, M1)', slug: 'macbook-pro-13-2020-m1' },
];

/** Короткое название для SEO (без скобок) */
export function modelShortName(modelName: string): string {
  // "MacBook Air 13 (2020, M1)" → "MacBook Air 13 M1 2020"
  const match = modelName.match(/^(.+?)\s*\((\d{4}),?\s*(.+?)\)$/);
  if (match) {
    return `${match[1]} ${match[3]}`;
  }
  return modelName;
}
