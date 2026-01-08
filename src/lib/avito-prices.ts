/**
 * Загрузка и обработка данных о ценах с Авито
 * 
 * Формат модели: "MacBook Air 13 (2020, M1)"
 */

import type { AvitoPricesData, AvitoPriceStat, MarketPriceResult, ConditionValue } from '@/types/avito-prices';
import { CONDITIONS } from '@/types/avito-prices';

let cachedData: AvitoPricesData | null = null;

/**
 * Загрузить данные о ценах
 */
export async function loadAvitoPrices(): Promise<AvitoPricesData> {
  if (cachedData) return cachedData;
  
  try {
    const response = await fetch('/data/avito-prices.json');
    if (!response.ok) {
      throw new Error('Failed to load avito prices');
    }
    cachedData = await response.json();
    return cachedData!;
  } catch (error) {
    console.error('Error loading avito prices:', error);
    return { generated_at: '', total_listings: 0, models: [], stats: [] };
  }
}

/**
 * Получить список моделей (формат каталога Авито)
 */
export function getModels(data: AvitoPricesData): string[] {
  return data.models || [];
}

/**
 * Получить уникальные RAM для модели
 */
export function getRamOptions(stats: AvitoPriceStat[], modelName: string): number[] {
  return [...new Set(
    stats.filter(s => s.model_name === modelName).map(s => s.ram)
  )].sort((a, b) => a - b);
}

/**
 * Получить уникальные SSD для модели и RAM
 */
export function getSsdOptions(stats: AvitoPriceStat[], modelName: string, ram: number): number[] {
  return [...new Set(
    stats.filter(s => s.model_name === modelName && s.ram === ram).map(s => s.ssd)
  )].sort((a, b) => a - b);
}

/**
 * Получить уникальные регионы
 */
export function getRegions(stats: AvitoPriceStat[]): string[] {
  return [...new Set(stats.map(s => s.region))].sort();
}

/**
 * Найти статистику по параметрам
 */
export function findPriceStat(
  stats: AvitoPriceStat[],
  modelName: string,
  ram: number,
  ssd: number,
  region?: string
): AvitoPriceStat | undefined {
  // Сначала ищем точное совпадение с регионом
  if (region) {
    const exact = stats.find(
      s => s.model_name === modelName && s.ram === ram && s.ssd === ssd && s.region === region
    );
    if (exact) return exact;
  }
  
  // Если не найдено, берем любой регион (Москва по умолчанию)
  return stats.find(
    s => s.model_name === modelName && s.ram === ram && s.ssd === ssd
  );
}

/**
 * Рассчитать цену выкупа с учетом состояния
 */
export function calculateBuyoutPrice(
  stat: AvitoPriceStat,
  condition: ConditionValue
): MarketPriceResult {
  const conditionData = CONDITIONS.find(c => c.value === condition);
  const coefficient = conditionData?.coefficient ?? 0.90;
  
  // Применяем коэффициент состояния к цене выкупа
  const adjustedBuyout = Math.round(stat.buyout_price * coefficient);
  
  return {
    found: true,
    marketMin: stat.min_price,
    marketMax: stat.max_price,
    marketMedian: stat.median_price,
    buyoutPrice: adjustedBuyout,
    samplesCount: stat.samples_count,
    updatedAt: stat.updated_at,
  };
}

/**
 * Форматирование размера SSD
 */
export function formatSsd(ssd: number): string {
  if (ssd >= 1024) {
    return `${ssd / 1024} TB`;
  }
  return `${ssd} GB`;
}

/**
 * Форматирование цены
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Фильтрация моделей по поисковому запросу
 */
export function filterModels(models: string[], search: string): string[] {
  if (!search) return models;
  const searchLower = search.toLowerCase();
  return models.filter(m => m.toLowerCase().includes(searchLower));
}
