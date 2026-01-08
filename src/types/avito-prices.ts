/**
 * Типы для данных о ценах с Авито
 * 
 * Формат модели соответствует каталогу Авито:
 *   "MacBook Air 13 (2020, M1)"
 *   "MacBook Pro 14 (2023, M3 Pro)"
 */

export interface AvitoPriceStat {
  model_name: string;      // "MacBook Air 13 (2020, M1)" - формат каталога Авито
  ram: number;             // GB
  ssd: number;             // GB
  region: string;          // "Москва" | "Санкт-Петербург" и т.д.
  median_price: number;    // Медианная цена рынка
  min_price: number;       // Минимальная цена (P10)
  max_price: number;       // Максимальная цена (P90)
  buyout_price: number;    // Рекомендуемая цена выкупа
  samples_count: number;   // Количество объявлений
  updated_at: string;      // ISO дата обновления
}

export interface AvitoPricesData {
  generated_at: string;
  total_listings: number;
  models: string[];         // Список уникальных моделей для фильтра
  stats: AvitoPriceStat[];
}

export interface MarketPriceResult {
  found: boolean;
  marketMin: number;
  marketMax: number;
  marketMedian: number;
  buyoutPrice: number;
  samplesCount: number;
  updatedAt: string;
}

// Города для выбора
export const REGIONS = [
  { value: 'Москва', label: 'Москва' },
  { value: 'Московская область', label: 'Московская область' },
  { value: 'Санкт-Петербург', label: 'Санкт-Петербург' },
] as const;

export type Region = typeof REGIONS[number]['value'];

// Состояния устройства
export const CONDITIONS = [
  { value: 'ideal', label: 'Идеальное', description: 'Как новый, без следов использования', coefficient: 1.0 },
  { value: 'excellent', label: 'Отличное', description: 'Минимальные следы, всё работает', coefficient: 0.95 },
  { value: 'good', label: 'Хорошее', description: 'Небольшие потёртости, полностью рабочий', coefficient: 0.90 },
  { value: 'fair', label: 'Есть дефекты', description: 'Царапины, сколы или ремонт', coefficient: 0.85 },
] as const;

export type ConditionValue = typeof CONDITIONS[number]['value'];
