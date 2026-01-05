/**
 * Типы для данных о ценах с Авито
 */

export interface AvitoPriceStat {
  model: string;           // "MacBook Air" | "MacBook Pro"
  cpu: string;             // "M1" | "M2" | "M3" | "M4" | "Intel"
  year: number;            // 2020-2025
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
  { value: 'ideal', label: 'Идеальное', coefficient: 1.0 },
  { value: 'excellent', label: 'Отличное', coefficient: 0.95 },
  { value: 'good', label: 'Хорошее', coefficient: 0.90 },
  { value: 'fair', label: 'Есть дефекты', coefficient: 0.85 },
] as const;

export type ConditionValue = typeof CONDITIONS[number]['value'];
