/**
 * Загрузка и обработка данных о ценах с Авито
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
    return { generated_at: '', total_listings: 0, stats: [] };
  }
}

/**
 * Получить уникальные модели
 */
export function getUniqueModels(stats: AvitoPriceStat[]): string[] {
  return [...new Set(stats.map(s => s.model))].sort();
}

/**
 * Получить уникальные процессоры для модели
 */
export function getUniqueCpus(stats: AvitoPriceStat[], model: string): string[] {
  return [...new Set(stats.filter(s => s.model === model).map(s => s.cpu))].sort((a, b) => {
    // Сортировка: M4 > M3 > M2 > M1 > Intel
    const order = ['M4', 'M3', 'M2', 'M1', 'Intel'];
    return order.indexOf(a) - order.indexOf(b);
  });
}

/**
 * Получить уникальные RAM для модели и процессора
 */
export function getUniqueRam(stats: AvitoPriceStat[], model: string, cpu: string): number[] {
  return [...new Set(
    stats.filter(s => s.model === model && s.cpu === cpu).map(s => s.ram)
  )].sort((a, b) => a - b);
}

/**
 * Получить уникальные SSD для модели, процессора и RAM
 */
export function getUniqueSsd(stats: AvitoPriceStat[], model: string, cpu: string, ram: number): number[] {
  return [...new Set(
    stats.filter(s => s.model === model && s.cpu === cpu && s.ram === ram).map(s => s.ssd)
  )].sort((a, b) => a - b);
}

/**
 * Получить уникальные регионы
 */
export function getUniqueRegions(stats: AvitoPriceStat[]): string[] {
  return [...new Set(stats.map(s => s.region))].sort();
}

/**
 * Найти статистику по параметрам
 */
export function findPriceStat(
  stats: AvitoPriceStat[],
  model: string,
  cpu: string,
  ram: number,
  ssd: number,
  region?: string
): AvitoPriceStat | undefined {
  // Сначала ищем точное совпадение с регионом
  if (region) {
    const exact = stats.find(
      s => s.model === model && s.cpu === cpu && s.ram === ram && s.ssd === ssd && s.region === region
    );
    if (exact) return exact;
  }
  
  // Если не найдено, берем любой регион
  return stats.find(
    s => s.model === model && s.cpu === cpu && s.ram === ram && s.ssd === ssd
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
