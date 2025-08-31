import { adjustments, ConditionGrade } from '@/config/buyout-adjustments';
import type { BuyoutRow } from '@/types/buyout';

export type EstimateInput = {
  model: string;
  ram?: string;
  storage?: string;
  batteryCycles?: number;
  condition: ConditionGrade;
  displayDefect?: boolean;
  bodyDefect?: boolean;
  hasCharger?: boolean;
  hasBox?: boolean;
  icloudBlocked?: boolean;
};

export function findBase(model: string, data: BuyoutRow[]) {
  const row = data.find((r) => r.model === model);
  return row?.basePrice ?? 0;
}

export function estimatePrice(input: EstimateInput, data: BuyoutRow[]) {
  const base = findBase(input.model, data);
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
  const res = await fetch('/data/buyout.json');
  if (!res.ok) return [];
  return res.json();
}

