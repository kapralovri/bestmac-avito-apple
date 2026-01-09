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
 * Возвращает только модели, для которых есть данные в stats
 */
export function getModels(data: AvitoPricesData): string[] {
  if (!data.stats || data.stats.length === 0) return [];
  
  // Берем уникальные модели только из stats (реальные данные парсинга)
  const uniqueModels = [...new Set(data.stats.map(s => s.model_name))];
  return uniqueModels.sort();
}

/**
 * Получить уникальные процессоры для модели
 */
export function getProcessorOptions(stats: AvitoPriceStat[], modelName: string): string[] {
  return [...new Set(
    stats.filter(s => s.model_name === modelName).map(s => s.processor)
  )].sort();
}

/**
 * Получить уникальные RAM для модели и процессора
 */
export function getRamOptions(stats: AvitoPriceStat[], modelName: string, processor?: string): number[] {
  return [...new Set(
    stats
      .filter(s => s.model_name === modelName && (!processor || s.processor === processor))
      .map(s => s.ram)
  )].sort((a, b) => a - b);
}

/**
 * Получить уникальные SSD для модели, процессора и RAM
 */
export function getSsdOptions(stats: AvitoPriceStat[], modelName: string, ram: number, processor?: string): number[] {
  return [...new Set(
    stats
      .filter(s => s.model_name === modelName && s.ram === ram && (!processor || s.processor === processor))
      .map(s => s.ssd)
  )].sort((a, b) => a - b);
}

/**
 * Найти статистику по параметрам
 */
export function findPriceStat(
  stats: AvitoPriceStat[],
  modelName: string,
  ram: number,
  ssd: number,
  processor?: string
): AvitoPriceStat | undefined {
  return stats.find(
    s => s.model_name === modelName && 
         s.ram === ram && 
         s.ssd === ssd && 
         (!processor || s.processor === processor)
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
