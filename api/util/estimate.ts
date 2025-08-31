import { adjustments } from '../../src/config/buyout-adjustments';

export function findBase(model: string, data: any[]) {
  const row = data.find((r) => r.model === model);
  return row?.basePrice ?? 0;
}

export function estimatePrice(input: any, data: any[]) {
  const base = findBase(input?.model, data);
  if (!base) return { base, priceMin: 0, priceMax: 0 };

  if (adjustments.icloudBlockedZero && input?.icloudBlocked) {
    return { base, priceMin: 0, priceMax: 0 };
  }

  let price = base;
  const condition = input?.condition || 'A';
  price *= adjustments.condition[condition];

  const cycles = Number(input?.batteryCycles || 0);
  const idx = adjustments.batteryCycles.thresholds.findIndex((t) => cycles < t);
  const penalty = idx === -1
    ? adjustments.batteryCycles.penalties.at(-1)!
    : adjustments.batteryCycles.penalties[idx];
  price -= penalty;

  if (input?.displayDefect) price -= base * adjustments.displayDefectPenalty;
  if (input?.bodyDefect) price -= base * adjustments.bodyDefectPenalty;

  if (input?.hasCharger === false) price -= adjustments.noChargerPenalty;
  if (input?.hasBox === false) price -= adjustments.noBoxPenalty;

  const spread = price * adjustments.minMaxSpreadPct;
  const priceMin = Math.max(0, Math.round(price - spread));
  const priceMax = Math.max(0, Math.round(price + spread));

  return { base, priceMin, priceMax };
}

