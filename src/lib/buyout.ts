import { adjustments, ConditionGrade } from '@/config/buyout-adjustments';
import type { BuyoutRow } from '@/types/buyout';

export type EstimateInput = {
  model: string;
  ram: string;
  storage: string;
  batteryCycles?: number;
  condition: ConditionGrade;
  displayDefect?: boolean;
  bodyDefect?: boolean;
  hasCharger?: boolean;
  hasBox?: boolean;
  icloudBlocked?: boolean;
};

export function findBase(model: string, ram: string, storage: string, data: BuyoutRow[]) {
  // Ищем все строки с данной комбинацией model + ram + storage
  const matches = data.filter(
    (r) => r.model === model && 
           r.ram === ram && 
           r.storage === storage
  );
  
  // Берем максимальную basePrice среди всех совпадений
  if (matches.length === 0) return 0;
  return Math.max(...matches.map(r => r.basePrice));
}

export function estimatePrice(input: EstimateInput, data: BuyoutRow[]) {
  const base = findBase(input.model, input.ram, input.storage, data);
  if (!base) return { base, priceMin: 0, priceMax: 0 };

  if (adjustments.icloudBlockedZero && input.icloudBlocked) {
    return { base, priceMin: 0, priceMax: 0 };
  }

  let price = base;

  // Состояние
  price *= adjustments.condition[input.condition];

  // Циклы батареи
  const cycles = input.batteryCycles ?? 0;
  const idx = adjustments.batteryCycles.thresholds.findIndex((t) => cycles < t);
  const penalty = idx === -1
    ? adjustments.batteryCycles.penalties.at(-1)!
    : adjustments.batteryCycles.penalties[idx];
  price -= penalty;

  // Дефекты
  if (input.displayDefect) price -= base * adjustments.displayDefectPenalty;
  if (input.bodyDefect) price -= base * adjustments.bodyDefectPenalty;

  // Комплект
  if (input.hasCharger === false) price -= adjustments.noChargerPenalty;
  if (input.hasBox === false) price -= adjustments.noBoxPenalty;

  const spread = price * adjustments.minMaxSpreadPct;
  const priceMin = Math.max(0, Math.round(price - spread));
  const priceMax = Math.max(0, Math.round(price + spread));

  return { base, priceMin, priceMax };
}

export async function loadBuyoutData(): Promise<BuyoutRow[]> {
  // Базовые данные
  const baseRes = await fetch('/data/buyout.json');
  const base: BuyoutRow[] = baseRes.ok ? await baseRes.json() : [];

  // Опциональные оверрайды ассортимента и цен
  let overrides: any[] = [];
  try {
    const o = await fetch('/data/buyout-overrides.json');
    if (o.ok) {
      overrides = await o.json();
    }
  } catch {
    // ignore
  }

  if (!overrides?.length) return base;

  type OverrideRow = Partial<BuyoutRow> & {
    model: string;
    ram?: string;
    storage?: string;
    _remove?: boolean;
  };

  const keyOf = (r: { model: string; ram?: string; storage?: string }) =>
    `${r.model}|${r.ram ?? ''}|${r.storage ?? ''}`;

  const map = new Map<string, BuyoutRow>();
  for (const r of base) map.set(keyOf(r), r);

  for (const raw of overrides as OverrideRow[]) {
    if (!raw?.model) continue;
    const key = keyOf(raw);
    if (raw._remove) {
      map.delete(key);
      continue;
    }
    const existing = map.get(key);
    const merged: BuyoutRow = {
      manufacturer: raw.manufacturer ?? existing?.manufacturer ?? 'Apple',
      model: raw.model,
      cpu: raw.cpu ?? existing?.cpu,
      ram: raw.ram ?? existing?.ram,
      storage: raw.storage ?? existing?.storage,
      gpu: raw.gpu ?? existing?.gpu,
      basePrice: typeof raw.basePrice === 'number' ? raw.basePrice : (existing?.basePrice ?? 0),
    };
    map.set(key, merged);
  }

  return Array.from(map.values());
}

